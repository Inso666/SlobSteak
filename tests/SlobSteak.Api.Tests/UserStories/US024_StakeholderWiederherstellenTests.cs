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
using SlobSteak.Domain.Stakeholders;
using SlobSteak.Infrastructure.Persistence;

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-024 (Stakeholder Wiederherstellen & Papierkorb-Ansicht: API + UI,
/// S3.x). Prüft ausschließlich die in
/// <c>docs/usecases/US-024-stakeholder-wiederherstellen.md</c> gelisteten Akzeptanzkriterien, ein
/// <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie im Story-Dokument, über
/// eine echte Testcontainers-PostgreSQL-Instanz. Akzeptanzkriterium 2s Aussage „nur ein
/// tatsächlich nicht existierender Stakeholder liefert 404“ ist über die API nicht beobachtbar
/// (siehe XML-Doc von <c>StakeholderController.RestoreStakeholder</c>) — stattdessen wird hier die
/// Idempotenz für einen bereits aktiven Stakeholder geprüft; der Fehlerpfad ist auf
/// Application-Ebene über <c>RestoreStakeholderServiceTests</c> abgedeckt. Akzeptanzkriterium 3
/// (UI-Umschalter/Badge) und 4 (UI-Wiederherstellen-Button ohne vollständigen Reload) siehe
/// <c>stakeholder-list.component.spec.ts</c>. Akzeptanzkriterium 5 (Verteilerlisten-Filter,
/// US-041) existiert als eigenständige Query noch nicht (weit spätere Phase) — hier daher nur
/// verifiziert, dass die Standardliste (US-025) den wiederhergestellten Stakeholder wieder
/// enthält; der US-041-Teil wird erneut geprüft, sobald diese Story entsteht (analog zur
/// dokumentierten Abweichung in US-023, siehe „Anmerkungen des Dev-Agenten“ in der Story-Datei).
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US024_StakeholderWiederherstellenTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us024-story-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public US024_StakeholderWiederherstellenTests(PostgresContainerFixture postgres)
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

    // AC 1: GET .../stakeholders?deleted=true liefert ausschließlich soft-gelöschte Stakeholder
    // inkl. deletedAt/deletedByName und ist ausschließlich für PL erreichbar; sonst 403 Forbidden.
    [Fact]
    public async Task AC1_DeletedView_ReturnsOnlySoftDeletedStakeholdersWithDeletionMetadata_PLOnly()
    {
        var (projectId, plUserId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        Guid deletedId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var active = Stakeholder.Create(projectId, StakeholderType.Person, "Aktiv", null, null, null, null, null, null, plUserId);
            var deleted = Stakeholder.Create(projectId, StakeholderType.Person, "Gelöscht", null, null, null, null, null, null, plUserId);
            deleted.SoftDelete(plUserId);
            dbContext.Stakeholders.AddRange(active, deleted);
            await dbContext.SaveChangesAsync();
            deletedId = deleted.Id;
        }

        using var plClient = AuthenticatedClient(plUserId);
        var response = await plClient.GetAsync($"/api/v1/projects/{projectId}/stakeholders?deleted=true");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var entries = body.EnumerateArray().ToList();
        entries.Should().ContainSingle().Which.GetProperty("id").GetGuid().Should().Be(deletedId);
        var entry = entries.Single();
        entry.GetProperty("deletedAt").GetDateTimeOffset().Should().NotBe(default);
        entry.GetProperty("deletedByName").GetString().Should().NotBeNullOrEmpty();

        var (_, userUserId) = (projectId, await AddMemberAsync(projectId, ProjectRole.User));
        using var userClient = AuthenticatedClient(userUserId);
        var forbiddenResponse = await userClient.GetAsync($"/api/v1/projects/{projectId}/stakeholders?deleted=true");
        forbiddenResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // AC 2: POST .../stakeholders/{id}/restore setzt deleted_at/deleted_by zurück auf null und
    // liefert 200 OK; danach erscheint der Stakeholder wieder in der Standardliste (US-025).
    [Fact]
    public async Task AC2_Restore_ClearsDeletedState_AndReappearsInDefaultList()
    {
        var (projectId, plUserId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        Guid stakeholderId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var stakeholder = Stakeholder.Create(projectId, StakeholderType.Person, "Wiederherstellbar", null, null, null, null, null, null, plUserId);
            stakeholder.SoftDelete(plUserId);
            dbContext.Stakeholders.Add(stakeholder);
            await dbContext.SaveChangesAsync();
            stakeholderId = stakeholder.Id;
        }

        using var client = AuthenticatedClient(plUserId);
        var restoreResponse = await client.PostAsync($"/api/v1/stakeholders/{stakeholderId}/restore", content: null);
        restoreResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var stakeholder = await dbContext.Stakeholders.SingleAsync(s => s.Id == stakeholderId);
            stakeholder.DeletedAt.Should().BeNull();
            stakeholder.DeletedBy.Should().BeNull();
        }

        var listResponse = await client.GetAsync($"/api/v1/projects/{projectId}/stakeholders");
        var listBody = await listResponse.Content.ReadFromJsonAsync<JsonElement>();
        listBody.EnumerateArray().Select(s => s.GetProperty("id").GetGuid()).Should().Contain(stakeholderId);
    }

    // AC 2 (Fortsetzung): idempotent — ein bereits aktiver (nie gelöschter) Stakeholder liefert
    // erneut 200 OK, ohne einen Fehler zu werfen.
    [Fact]
    public async Task AC2_Restore_IsIdempotent_AlreadyActiveStakeholderReturnsOk()
    {
        var (projectId, plUserId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        Guid stakeholderId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var stakeholder = Stakeholder.Create(projectId, StakeholderType.Person, "Bereits aktiv", null, null, null, null, null, null, plUserId);
            dbContext.Stakeholders.Add(stakeholder);
            await dbContext.SaveChangesAsync();
            stakeholderId = stakeholder.Id;
        }

        using var client = AuthenticatedClient(plUserId);
        var response = await client.PostAsync($"/api/v1/stakeholders/{stakeholderId}/restore", content: null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private async Task<(Guid ProjectId, Guid UserId)> CreateProjectWithMemberAsync(ProjectRole role)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var user = User.Create("Zielnutzer", $"us024-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        user.ChangePassword("correct-horse-battery-2");
        dbContext.Users.Add(user);

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        project.AssignMember(user.Id, role);
        dbContext.Projects.Add(project);

        await dbContext.SaveChangesAsync();

        return (project.Id, user.Id);
    }

    private async Task<Guid> AddMemberAsync(Guid projectId, ProjectRole role)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        var projectRepository = scope.ServiceProvider.GetRequiredService<IProjectRepository>();

        var user = User.Create("Weiterer Nutzer", $"us024-member-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        user.ChangePassword("correct-horse-battery-2");
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        var project = await projectRepository.FindByIdAsync(projectId);
        project!.AssignMember(user.Id, role);
        await projectRepository.SaveAsync(project);

        return user.Id;
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
