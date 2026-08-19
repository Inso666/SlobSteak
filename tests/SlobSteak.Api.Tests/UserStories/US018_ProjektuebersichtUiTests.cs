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
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.ValueObjects;
using SlobSteak.Domain.Stakeholders;
using SlobSteak.Infrastructure.Persistence;

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-018 (Projektübersicht-Screen, S2). Prüft ausschließlich die in
/// <c>docs/usecases/US-018-projektuebersicht-ui.md</c> gelisteten Akzeptanzkriterien, ein
/// <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie im Story-Dokument, über
/// eine echte Testcontainers-PostgreSQL-Instanz. Akzeptanzkriterium 2–5 betreffen primär die
/// Angular-Oberfläche (siehe <c>project-overview.component.spec.ts</c>) — hier wird das
/// Backend-Verhalten geprüft, auf dem die UI aufsetzt: <c>GET /api/v1/projects</c> selbst
/// (Akzeptanzkriterium 1) sowie dass Systemadmins zusätzlich über <c>GET /api/v1/admin/projects</c>
/// (US-017) auf alle Projekte zugreifen können, unabhängig von eigener Mitgliedschaft
/// (Akzeptanzkriterium 2), und dass Nicht-Mitglieder keinen Zugriff auf fremde Projekte über diese
/// Liste erhalten (Invariante aus Abschnitt 4 der Story).
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US018_ProjektuebersichtUiTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us018-story-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public US018_ProjektuebersichtUiTests(PostgresContainerFixture postgres)
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

    // AC 1: GET /api/v1/projects liefert für den angemeldeten Nutzer ausschließlich Projekte, in
    // denen er eine ProjectMembership hat, jeweils mit role und stakeholderCount.
    [Fact]
    public async Task AC1_ListMyProjects_ReturnsOnlyOwnMembershipsWithRoleAndStakeholderCount()
    {
        Guid userId;
        Guid memberProjectId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

            // project_memberships.user_id hat einen FK auf users — daher ein echtes User-Konto
            // nötig; ChangePassword() löscht sofort das mustChangePassword-Flag, damit die
            // PasswordChangeRequiredMiddleware den nachfolgenden GET-Aufruf nicht blockiert (das
            // ist hier nicht Untersuchungsgegenstand, siehe US-008-Story-Test dafür).
            var user = User.Create("Zielnutzer", $"us018-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
            user.ChangePassword("correct-horse-battery-2");
            dbContext.Users.Add(user);
            userId = user.Id;

            var memberProject = Project.Create("Mein Projekt", null);
            memberProject.AssignMember(userId, ProjectRole.Architect);
            dbContext.Projects.Add(memberProject);
            memberProjectId = memberProject.Id;

            var foreignProject = Project.Create("Fremdes Projekt", null);
            dbContext.Projects.Add(foreignProject);

            await dbContext.SaveChangesAsync();

            var stakeholder = new Stakeholder(
                Guid.NewGuid(), memberProjectId, StakeholderType.Person, "Max Mustermann", null, null, null, null, null,
                null, userId, DateTimeOffset.UtcNow, userId, DateTimeOffset.UtcNow, null, null);
            dbContext.Stakeholders.Add(stakeholder);
            var deletedStakeholder = new Stakeholder(
                Guid.NewGuid(), memberProjectId, StakeholderType.Person, "Gelöscht", null, null, null, null, null,
                null, userId, DateTimeOffset.UtcNow, userId, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow, userId);
            dbContext.Stakeholders.Add(deletedStakeholder);
            await dbContext.SaveChangesAsync();
        }

        using var client = AuthenticatedClient(userId, isSystemAdmin: false);
        var response = await client.GetAsync("/api/v1/projects");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var projects = await response.Content.ReadFromJsonAsync<JsonElement>();
        var items = projects.EnumerateArray().ToList();
        items.Should().ContainSingle();
        var entry = items.Single();
        entry.GetProperty("id").GetGuid().Should().Be(memberProjectId);
        entry.GetProperty("role").GetString().Should().Be("Architect");
        entry.GetProperty("stakeholderCount").GetInt32().Should().Be(1);
    }

    // AC 2: Systemadmins sehen zusätzlich einen Tab/Bereich „Alle Projekte“, der
    // GET /api/v1/admin/projects (alle Projekte, unabhängig von Mitgliedschaft) abfragt.
    [Fact]
    public async Task AC2_SystemAdmin_CanListAllProjects_ViaAdminEndpoint_RegardlessOfMembership()
    {
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            dbContext.Projects.Add(Project.Create($"Projekt-{Guid.NewGuid():N}", null));
            await dbContext.SaveChangesAsync();
        }

        using var admin = AuthenticatedClient(Guid.NewGuid(), isSystemAdmin: true);
        var response = await admin.GetAsync("/api/v1/admin/projects");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var projects = await response.Content.ReadFromJsonAsync<JsonElement>();
        projects.EnumerateArray().Should().NotBeEmpty();
    }

    // Invariante aus Abschnitt 4 der Story: Nicht-Admin-Nutzer sehen ausschließlich Projekte mit
    // eigener Mitgliedschaft — kein Zugriff auf fremde Projekte über GET /api/v1/projects.
    [Fact]
    public async Task Invariant_NonAdminWithoutAnyMembership_SeesEmptyList()
    {
        Guid foreignProjectId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var foreignProject = Project.Create($"Fremdes Projekt {Guid.NewGuid():N}", null);
            dbContext.Projects.Add(foreignProject);
            await dbContext.SaveChangesAsync();
            foreignProjectId = foreignProject.Id;
        }

        using var client = AuthenticatedClient(Guid.NewGuid(), isSystemAdmin: false);
        var response = await client.GetAsync("/api/v1/projects");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var projects = await response.Content.ReadFromJsonAsync<JsonElement>();
        projects.EnumerateArray().Should().NotContain(p => p.GetProperty("id").GetGuid() == foreignProjectId);
    }

    private HttpClient AuthenticatedClient(Guid userId, bool isSystemAdmin)
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
