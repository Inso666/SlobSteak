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
/// Dedizierter Story-Test für US-033 (Vergleichsmodus-Query-API, zwei Perspektiven). Prüft
/// ausschließlich die in <c>docs/usecases/US-033-map-vergleich-api.md</c> gelisteten
/// Akzeptanzkriterien, ein <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie
/// im Story-Dokument, über eine echte Testcontainers-PostgreSQL-Instanz — Konvention aus
/// <c>.claude/agents/qa.md</c> Abschnitt 1, analog zu <c>US031_MapQueryApiTests</c>. Ergänzend
/// dazu deckt <c>Map/MapControllerTests.cs</c> Response-Contract-Details und weitere Randfälle ab,
/// die über die Akzeptanzkriterien hinausgehen.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US033_MapComparisonApiTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us033-story-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public US033_MapComparisonApiTests(PostgresContainerFixture postgres)
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

    // AC 1: GET /api/v1/projects/{projectId}/map/compare?primary={Rolle}&secondary={Rolle} liefert
    // je Stakeholder mit Assessment in mindestens einer der beiden Rollen ein Objekt mit optionalen
    // Feldern primary/secondary: {influence, interest} | null.
    [Fact]
    public async Task AC1_Get_ReturnsEntryWithPrimaryAndSecondaryValues_ForStakeholderAssessedInBothRoles()
    {
        var (projectId, plUserId, stakeholderId) = await CreateProjectWithAssessedStakeholderAsync(
            createSecondaryAssessment: true);
        using var client = AuthenticatedClient(plUserId);

        var response = await client.GetAsync($"/api/v1/projects/{projectId}/map/compare?primary=PL&secondary=Coreteam");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetArrayLength().Should().Be(1);
        var entry = body[0];
        entry.GetProperty("stakeholderId").GetGuid().Should().Be(stakeholderId);
        entry.GetProperty("name").GetString().Should().Be("Bewerteter Stakeholder");

        var primary = entry.GetProperty("primary");
        primary.ValueKind.Should().NotBe(JsonValueKind.Null);
        primary.GetProperty("influence").GetInt32().Should().Be(40);
        primary.GetProperty("interest").GetInt32().Should().Be(60);

        var secondary = entry.GetProperty("secondary");
        secondary.ValueKind.Should().NotBe(JsonValueKind.Null);
        secondary.GetProperty("influence").GetInt32().Should().Be(15);
        secondary.GetProperty("interest").GetInt32().Should().Be(25);
    }

    // AC 1 (Fortsetzung): Stakeholder mit Assessment nur in einer der beiden Rollen erscheint mit
    // dem jeweils anderen Feld als null.
    [Fact]
    public async Task AC1_Get_ReturnsNullSecondary_ForStakeholderAssessedInOnlyPrimaryRole()
    {
        var (projectId, plUserId, stakeholderId) = await CreateProjectWithAssessedStakeholderAsync(
            createSecondaryAssessment: false);
        using var client = AuthenticatedClient(plUserId);

        var response = await client.GetAsync($"/api/v1/projects/{projectId}/map/compare?primary=PL&secondary=Coreteam");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetArrayLength().Should().Be(1);
        var entry = body[0];
        entry.GetProperty("stakeholderId").GetGuid().Should().Be(stakeholderId);
        entry.GetProperty("primary").ValueKind.Should().NotBe(JsonValueKind.Null);
        entry.GetProperty("secondary").ValueKind.Should().Be(JsonValueKind.Null);
    }

    // AC 2: Ist primary gleich secondary, liefert der Endpoint 400 Bad Request.
    [Fact]
    public async Task AC2_Get_PrimaryEqualsSecondary_ReturnsBadRequest()
    {
        var (projectId, plUserId, _) = await CreateProjectWithAssessedStakeholderAsync(createSecondaryAssessment: false);
        using var client = AuthenticatedClient(plUserId);

        var response = await client.GetAsync($"/api/v1/projects/{projectId}/map/compare?primary=PL&secondary=PL");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // AC 3: Stakeholder ganz ohne Assessment in beiden Perspektiven sind nicht im Ergebnis
    // enthalten.
    [Fact]
    public async Task AC3_Get_ExcludesStakeholderWithoutAssessmentInEitherRole()
    {
        var (projectId, plUserId, stakeholderId) = await CreateProjectWithAssessedStakeholderAsync(
            createSecondaryAssessment: false);
        using var client = AuthenticatedClient(plUserId);

        var response = await client.GetAsync($"/api/v1/projects/{projectId}/map/compare?primary=PL&secondary=Architect");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        // Der Stakeholder mit PL-Assessment bleibt weiterhin enthalten (Assessment in primary),
        // der zweite, gänzlich unbewertete Stakeholder aus derselben Projekt-Fixture nicht.
        body.GetArrayLength().Should().Be(1);
        body[0].GetProperty("stakeholderId").GetGuid().Should().Be(stakeholderId);
    }

    // AC 4: Endpoint liefert 403 Forbidden für Rolle User.
    [Fact]
    public async Task AC4_Get_UserRole_ReturnsForbidden()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var plUser = User.Create("PL Nutzer", $"us033-pl-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        plUser.ChangePassword("correct-horse-battery-2");
        var userRoleUser = User.Create("User-Rolle Nutzer", $"us033-user-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        userRoleUser.ChangePassword("correct-horse-battery-2");
        dbContext.Users.AddRange(plUser, userRoleUser);

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        project.AssignMember(plUser.Id, ProjectRole.PL);
        project.AssignMember(userRoleUser.Id, ProjectRole.User);
        dbContext.Projects.Add(project);

        await dbContext.SaveChangesAsync();

        using var client = AuthenticatedClient(userRoleUser.Id);
        var response = await client.GetAsync($"/api/v1/projects/{project.Id}/map/compare?primary=PL&secondary=Coreteam");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // AC 5: Integrationstest deckt: Stakeholder mit Assessment in beiden Rollen, nur einer Rolle,
    // keiner Rolle (ausgeschlossen). Die einzelnen Fälle sind bereits durch AC 1 (beide Rollen/nur
    // primäre Rolle) und AC 3 (keine Rolle, ausgeschlossen) abgedeckt; hier zusätzlich alle drei
    // Fälle gemeinsam in einem Projekt, um das Zusammenspiel zu belegen.
    [Fact]
    public async Task AC5_Get_CoversBothRoles_OnlyOneRole_AndNeitherRole_InSameProject()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var plUser = User.Create("PL Nutzer", $"us033-ac5-pl-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        plUser.ChangePassword("correct-horse-battery-2");
        dbContext.Users.Add(plUser);

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        project.AssignMember(plUser.Id, ProjectRole.PL);
        dbContext.Projects.Add(project);

        var bothRoles = Stakeholder.Create(project.Id, StakeholderType.Person, "Beide Rollen", null, null, null, null, null, null, plUser.Id);
        var onlyPrimary = Stakeholder.Create(project.Id, StakeholderType.Person, "Nur PL", null, null, null, null, null, null, plUser.Id);
        var neitherRole = Stakeholder.Create(project.Id, StakeholderType.Person, "Keine Rolle", null, null, null, null, null, null, plUser.Id);
        dbContext.Stakeholders.AddRange(bothRoles, onlyPrimary, neitherRole);

        dbContext.StakeholderAssessments.Add(StakeholderAssessment.Create(bothRoles.Id, ProjectRole.PL, 30, 70, null, plUser.Id));
        dbContext.StakeholderAssessments.Add(StakeholderAssessment.Create(bothRoles.Id, ProjectRole.Coreteam, 35, 75, null, plUser.Id));
        dbContext.StakeholderAssessments.Add(StakeholderAssessment.Create(onlyPrimary.Id, ProjectRole.PL, 20, 20, null, plUser.Id));

        await dbContext.SaveChangesAsync();

        using var client = AuthenticatedClient(plUser.Id);
        var response = await client.GetAsync($"/api/v1/projects/{project.Id}/map/compare?primary=PL&secondary=Coreteam");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetArrayLength().Should().Be(2);

        var stakeholderIds = body.EnumerateArray().Select(e => e.GetProperty("stakeholderId").GetGuid()).ToList();
        stakeholderIds.Should().Contain(bothRoles.Id);
        stakeholderIds.Should().Contain(onlyPrimary.Id);
        stakeholderIds.Should().NotContain(neitherRole.Id);

        var bothRolesEntry = body.EnumerateArray().Single(e => e.GetProperty("stakeholderId").GetGuid() == bothRoles.Id);
        bothRolesEntry.GetProperty("primary").ValueKind.Should().NotBe(JsonValueKind.Null);
        bothRolesEntry.GetProperty("secondary").ValueKind.Should().NotBe(JsonValueKind.Null);

        var onlyPrimaryEntry = body.EnumerateArray().Single(e => e.GetProperty("stakeholderId").GetGuid() == onlyPrimary.Id);
        onlyPrimaryEntry.GetProperty("primary").ValueKind.Should().NotBe(JsonValueKind.Null);
        onlyPrimaryEntry.GetProperty("secondary").ValueKind.Should().Be(JsonValueKind.Null);
    }

    /// <summary>Erstellt ein Projekt mit PL-Mitgliedschaft, einen Stakeholder mit PL-Assessment
    /// (Einfluss 40 / Interesse 60), optional zusätzlich einem Coreteam-Assessment (Einfluss 15 /
    /// Interesse 25), sowie einen zweiten Stakeholder ganz ohne Assessment (Grundlage für AC 3).</summary>
    private async Task<(Guid ProjectId, Guid PlUserId, Guid AssessedStakeholderId)> CreateProjectWithAssessedStakeholderAsync(
        bool createSecondaryAssessment)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var plUser = User.Create("PL Nutzer", $"us033-pl-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        plUser.ChangePassword("correct-horse-battery-2");
        dbContext.Users.Add(plUser);

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        project.AssignMember(plUser.Id, ProjectRole.PL);
        dbContext.Projects.Add(project);

        var assessedStakeholder = Stakeholder.Create(
            project.Id, StakeholderType.Person, "Bewerteter Stakeholder", null, null, null, null, null, null, plUser.Id);
        var unassessedStakeholder = Stakeholder.Create(
            project.Id, StakeholderType.Person, "Unbewerteter Stakeholder", null, null, null, null, null, null, plUser.Id);
        dbContext.Stakeholders.AddRange(assessedStakeholder, unassessedStakeholder);

        dbContext.StakeholderAssessments.Add(StakeholderAssessment.Create(assessedStakeholder.Id, ProjectRole.PL, 40, 60, null, plUser.Id));
        if (createSecondaryAssessment)
        {
            dbContext.StakeholderAssessments.Add(StakeholderAssessment.Create(assessedStakeholder.Id, ProjectRole.Coreteam, 15, 25, null, plUser.Id));
        }

        await dbContext.SaveChangesAsync();

        return (project.Id, plUser.Id, assessedStakeholder.Id);
    }

    private HttpClient AuthenticatedClient(Guid userId)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { [JwtSettings.SigningKeyConfigurationKey] = SigningKey })
            .Build();
        var token = new JwtTokenGenerator(configuration).GenerateToken(userId, isSystemAdmin: false);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}
