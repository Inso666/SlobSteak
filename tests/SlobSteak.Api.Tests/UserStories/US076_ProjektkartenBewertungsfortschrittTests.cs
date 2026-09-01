using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SlobSteak.Api.Auth;
using SlobSteak.Api.Tests.Persistence;
using SlobSteak.Domain.Assessments;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;
using SlobSteak.Infrastructure.Persistence;

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-076 (Rollen-Bewertungsfortschritt/„unbewertet"-Hinweis auf
/// Projektkarten) — ausschließlich der Backend-Anteil: <c>Project.UpdatedAt</c>, die neue
/// <c>ProjectAssessmentProgressQuery</c> sowie die additive Erweiterung von
/// <c>ProjectOverviewResponse</c>. Prüft ausschließlich die in
/// <c>docs/usecases/US-076-projektkarten-bewertungsfortschritt.md</c> gelisteten
/// Akzeptanzkriterien, ein <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie
/// im Story-Dokument (Konvention <c>.claude/agents/qa.md</c> Abschnitt 1), analog zu
/// <c>US074_ProjektuebersichtSidebarToolbarCardsTests</c>.
///
/// Die rein visuellen Akzeptanzkriterien (Fortschritts-Ringe, Attention-Banner, Kartenfußzeile,
/// Sortier-Dropdown, Angular-`TestBed`-Test) sind reine Frontend-Anteile und werden durch
/// <c>us-076-projektkarten-bewertungsfortschritt.spec.ts</c> abgedeckt. Die vollständige,
/// erschöpfende Abdeckung aller fünf <c>UpdatedAt</c>-Mutationen (Archive/Reactivate/AssignMember/
/// ChangeMemberRole/RemoveMember) liegt in <c>ProjectTests</c>/<c>ProjectMembershipTests</c>
/// (<c>SlobSteak.Domain.Tests</c>) — hier wird stellvertretend nur <c>AssignMember</c> über die
/// echte HTTP-Kette verifiziert, da Archive/Reactivate (noch) keinen eigenen API-Endpunkt haben.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US076_ProjektkartenBewertungsfortschrittTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us076-story-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public US076_ProjektkartenBewertungsfortschrittTests(PostgresContainerFixture postgres)
    {
        _factory = SlobSteakApiFactory.WithConnectionString(
            postgres.ConnectionString,
            new Dictionary<string, string?> { [JwtSettings.SigningKeyConfigurationKey] = SigningKey });
    }

    public async Task InitializeAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        await dbContext.Database.MigrateAsync();
    }

    public Task DisposeAsync()
    {
        _factory.Dispose();
        return Task.CompletedTask;
    }

    // AC 1 (Teil 1): Project.UpdatedAt ist initial gleich CreatedAt — geprüft nach einem echten
    // Persistenz-Roundtrip (neu aus der Datenbank geladen, nicht die noch im Speicher getrackte
    // Instanz). Bewusst ohne Mitgliedschaft/HTTP-Aufruf: Eine AssignMember-Zuweisung (nötig, damit
    // das Projekt über GET /api/v1/projects sichtbar wäre) würde UpdatedAt selbst bereits
    // aktualisieren, noch bevor der Ausgangszustand geprüft werden könnte.
    [Fact]
    public async Task AC1_NewProject_UpdatedAtEqualsCreatedAt()
    {
        Guid projectId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var project = Project.Create("Neues Projekt", null);
            dbContext.Projects.Add(project);
            projectId = project.Id;

            await dbContext.SaveChangesAsync();
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var reloaded = await dbContext.Projects.AsNoTracking().SingleAsync(p => p.Id == projectId);
            reloaded.UpdatedAt.Should().Be(reloaded.CreatedAt);
        }
    }

    // AC 1 (Teil 2): AssignMember (eine der fünf genannten Mutationen, hier über den echten
    // Admin-Endpunkt US-015 ausgelöst) aktualisiert UpdatedAt. Die übrigen vier Mutationen sind
    // exakt so exhaustiv in den Domain.Tests abgedeckt (siehe Klassendoku).
    [Fact]
    public async Task AC1_AfterAssignMemberViaAdminApi_UpdatedAtChanges()
    {
        Guid adminId;
        Guid targetUserId;
        Guid projectId;
        DateTimeOffset initialUpdatedAt;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var admin = User.CreateSystemAdmin("Admin", $"us076-admin-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
            admin.ChangePassword("correct-horse-battery-2");
            var targetUser = User.Create("Zielnutzer", $"us076-target-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
            targetUser.ChangePassword("correct-horse-battery-2");
            dbContext.Users.AddRange(admin, targetUser);
            adminId = admin.Id;
            targetUserId = targetUser.Id;

            var project = Project.Create("Projekt ohne Mitgliedschaft", null);
            dbContext.Projects.Add(project);
            projectId = project.Id;
            await dbContext.SaveChangesAsync();

            initialUpdatedAt = project.UpdatedAt;
        }

        using var adminClient = AuthenticatedClient(adminId, isSystemAdmin: true);
        var assignResponse = await adminClient.PostAsJsonAsync(
            $"/api/v1/admin/projects/{projectId}/memberships", new { userId = targetUserId, role = "PL" });
        assignResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var project = await dbContext.Projects.SingleAsync(p => p.Id == projectId);
            project.UpdatedAt.Should().BeAfter(initialUpdatedAt);
        }
    }

    // AC 2/8: Die neue Application-Query liefert je Rolle den gerundeten Anteil aktiver
    // Stakeholder mit Assessment — hier: 1 von 3 aktiven Stakeholdern für PL bewertet ≈ 33 %.
    [Fact]
    public async Task AC2_ReturnsRoundedAssessmentPercentPerRole()
    {
        var (projectId, plUserId) = await CreateProjectWithPartiallyAssessedStakeholdersAsync();
        using var client = AuthenticatedClient(plUserId);

        var response = await client.GetAsync("/api/v1/projects");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var entry = await SingleProjectAsync(response, projectId);
        entry.GetProperty("pl").GetProperty("percent").GetInt32().Should().Be(33);
        entry.GetProperty("pl").GetProperty("unassessedCount").GetInt32().Should().Be(2);
        entry.GetProperty("coreteam").GetProperty("percent").GetInt32().Should().Be(0);
        entry.GetProperty("coreteam").GetProperty("unassessedCount").GetInt32().Should().Be(3);
    }

    // AC 3: ProjectOverviewResponse ist additiv erweitert — bestehende Felder (id/name/role/
    // stakeholderCount/status/createdAt) bleiben unverändert neben den neuen Feldern erhalten.
    [Fact]
    public async Task AC3_ResponseIncludesExistingFieldsAlongsideNewUpdatedAtAndRoleProgressFields()
    {
        var (projectId, plUserId) = await CreateProjectWithPartiallyAssessedStakeholdersAsync();
        using var client = AuthenticatedClient(plUserId);

        var response = await client.GetAsync("/api/v1/projects");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var entry = await SingleProjectAsync(response, projectId);
        entry.GetProperty("id").GetGuid().Should().Be(projectId);
        entry.GetProperty("role").GetString().Should().Be("PL");
        entry.GetProperty("stakeholderCount").GetInt32().Should().Be(3);
        entry.GetProperty("status").GetString().Should().Be("Active");
        entry.TryGetProperty("createdAt", out _).Should().BeTrue();
        entry.TryGetProperty("updatedAt", out _).Should().BeTrue();
        entry.TryGetProperty("pl", out _).Should().BeTrue();
        entry.TryGetProperty("coreteam", out _).Should().BeTrue();
        entry.TryGetProperty("architect", out _).Should().BeTrue();
    }

    // AC 8 (Randfall 1): 0 aktive Stakeholder → keine Division durch 0, sinnvoller Default (0 %)
    // für alle drei Rollen statt eines Fehlers.
    [Fact]
    public async Task AC8_ProjectWithoutActiveStakeholders_ReturnsZeroPercentWithoutError()
    {
        Guid userId;
        Guid projectId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var user = User.Create("Zielnutzer", $"us076-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
            user.ChangePassword("correct-horse-battery-2");
            dbContext.Users.Add(user);
            userId = user.Id;

            var project = Project.Create("Projekt ohne Stakeholder", null);
            project.AssignMember(userId, ProjectRole.Architect);
            dbContext.Projects.Add(project);
            projectId = project.Id;

            await dbContext.SaveChangesAsync();
        }

        using var client = AuthenticatedClient(userId);
        var response = await client.GetAsync("/api/v1/projects");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var entry = await SingleProjectAsync(response, projectId);
        entry.GetProperty("pl").GetProperty("percent").GetInt32().Should().Be(0);
        entry.GetProperty("coreteam").GetProperty("percent").GetInt32().Should().Be(0);
        entry.GetProperty("architect").GetProperty("percent").GetInt32().Should().Be(0);
    }

    // AC 8 (Randfall 2): Vollständige Bewertung aller aktiven Stakeholder einer Rolle → 100 %.
    [Fact]
    public async Task AC8_AllActiveStakeholdersAssessedForRole_Returns100Percent()
    {
        Guid userId;
        Guid projectId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var user = User.Create("Zielnutzer", $"us076-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
            user.ChangePassword("correct-horse-battery-2");
            dbContext.Users.Add(user);
            userId = user.Id;

            var project = Project.Create("Vollständig bewertetes Projekt", null);
            project.AssignMember(userId, ProjectRole.Coreteam);
            dbContext.Projects.Add(project);
            projectId = project.Id;

            var stakeholder = Stakeholder.Create(project.Id, StakeholderType.Person, "Vollständig bewertet", null, null, null, null, null, null, userId);
            dbContext.Stakeholders.Add(stakeholder);
            dbContext.StakeholderAssessments.Add(StakeholderAssessment.Create(stakeholder.Id, ProjectRole.Coreteam, 50, 50, null, userId));

            await dbContext.SaveChangesAsync();
        }

        using var client = AuthenticatedClient(userId);
        var response = await client.GetAsync("/api/v1/projects");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var entry = await SingleProjectAsync(response, projectId);
        entry.GetProperty("coreteam").GetProperty("percent").GetInt32().Should().Be(100);
        entry.GetProperty("coreteam").GetProperty("unassessedCount").GetInt32().Should().Be(0);
    }

    /// <summary>Erstellt ein Projekt mit drei aktiven Stakeholdern, von denen genau einer ein
    /// PL-Assessment hat (1/3 ≈ 33 %) — Grundlage für AC 2/AC 3.</summary>
    private async Task<(Guid ProjectId, Guid PlUserId)> CreateProjectWithPartiallyAssessedStakeholdersAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var plUser = User.Create("PL Nutzer", $"us076-pl-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        plUser.ChangePassword("correct-horse-battery-2");
        dbContext.Users.Add(plUser);

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        project.AssignMember(plUser.Id, ProjectRole.PL);
        dbContext.Projects.Add(project);

        var assessed = Stakeholder.Create(project.Id, StakeholderType.Person, "Bewertet", null, null, null, null, null, null, plUser.Id);
        var unassessed1 = Stakeholder.Create(project.Id, StakeholderType.Person, "Unbewertet1", null, null, null, null, null, null, plUser.Id);
        var unassessed2 = Stakeholder.Create(project.Id, StakeholderType.Person, "Unbewertet2", null, null, null, null, null, null, plUser.Id);
        dbContext.Stakeholders.AddRange(assessed, unassessed1, unassessed2);

        dbContext.StakeholderAssessments.Add(StakeholderAssessment.Create(assessed.Id, ProjectRole.PL, 40, 60, null, plUser.Id));

        await dbContext.SaveChangesAsync();

        return (project.Id, plUser.Id);
    }

    private static async Task<JsonElement> SingleProjectAsync(HttpResponseMessage response, Guid projectId)
    {
        var projects = await response.Content.ReadFromJsonAsync<JsonElement>();
        return projects.EnumerateArray().Single(p => p.GetProperty("id").GetGuid() == projectId);
    }

    private HttpClient AuthenticatedClient(Guid userId, bool isSystemAdmin = false)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { [JwtSettings.SigningKeyConfigurationKey] = SigningKey })
            .Build();
        var token = new JwtTokenGenerator(configuration).GenerateToken(userId, isSystemAdmin);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}
