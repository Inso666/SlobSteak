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
using SlobSteak.Infrastructure.Persistence;

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-017 (Admin-Bereich UI: Projektverwaltung & Mitgliederzuweisung).
/// Prüft ausschließlich die in
/// <c>docs/usecases/US-017-admin-ui-projektverwaltung.md</c> gelisteten Akzeptanzkriterien, ein
/// <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie im Story-Dokument, über
/// die API-Endpunkte, auf denen die Angular-Oberfläche aufsetzt (echte Testcontainers-PostgreSQL-
/// Instanz). AC2–AC4 rufen dieselben Endpunkte auf, die bereits durch US-014/US-015 abgedeckt
/// sind (<c>POST /api/v1/admin/projects</c>, <c>POST/PATCH/DELETE .../memberships</c>) — hier wird
/// zusätzlich der in dieser Story neu eingeführte <c>GET .../memberships</c>-Endpunkt geprüft, der
/// die Mitgliederverwaltung im Frontend erst mit aufgelösten Nutzernamen befüllbar macht.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US017_AdminUiProjektverwaltungTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us017-story-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public US017_AdminUiProjektverwaltungTests(PostgresContainerFixture postgres)
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

    // AC 1: GET /api/v1/admin/projects liefert je Projekt Name, Status und Mitgliederzahl.
    [Fact]
    public async Task AC1_ListProjects_ReturnsNameStatusAndMemberCount()
    {
        var (projectId, userId) = await CreateProjectAndUserAsync();
        using var admin = AdminClient();
        await admin.PostAsJsonAsync($"/api/v1/admin/projects/{projectId}/memberships", new { userId, role = "PL" });

        var response = await admin.GetAsync("/api/v1/admin/projects");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var projects = await response.Content.ReadFromJsonAsync<JsonElement>();
        var entry = projects.EnumerateArray().Single(p => p.GetProperty("id").GetGuid() == projectId);
        entry.GetProperty("name").GetString().Should().NotBeNullOrEmpty();
        entry.GetProperty("status").GetString().Should().Be("Active");
        entry.GetProperty("memberCount").GetInt32().Should().Be(1);
    }

    // AC 2: POST /api/v1/admin/projects (Formular „Projekt anlegen“) legt ein neues Projekt an.
    [Fact]
    public async Task AC2_CreateProject_Returns201_AndAppearsInList()
    {
        using var admin = AdminClient();
        var name = $"Projekt-{Guid.NewGuid():N}";

        var createResponse = await admin.PostAsJsonAsync("/api/v1/admin/projects", new { name, description = "Beschreibung" });
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var listResponse = await admin.GetAsync("/api/v1/admin/projects");
        var projects = await listResponse.Content.ReadFromJsonAsync<JsonElement>();
        projects.EnumerateArray().Should().Contain(p => p.GetProperty("name").GetString() == name);
    }

    // AC 3: Ein Nutzer wird per POST .../memberships zugewiesen; GET .../memberships zeigt die
    // Zuweisung anschließend mit aufgelöstem Nutzernamen/E-Mail (für das Dropdown/die Mitglieder-
    // liste der Mitgliederverwaltung).
    [Fact]
    public async Task AC3_AssignMember_AppearsInMembershipListWithResolvedUser()
    {
        var (projectId, userId) = await CreateProjectAndUserAsync();
        using var admin = AdminClient();

        var assignResponse = await admin.PostAsJsonAsync(
            $"/api/v1/admin/projects/{projectId}/memberships", new { userId, role = "PL" });
        assignResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var listResponse = await admin.GetAsync($"/api/v1/admin/projects/{projectId}/memberships");
        listResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var memberships = await listResponse.Content.ReadFromJsonAsync<JsonElement>();
        var entry = memberships.EnumerateArray().Single(m => m.GetProperty("userId").GetGuid() == userId);
        entry.GetProperty("userName").GetString().Should().NotBeNullOrEmpty();
        entry.GetProperty("userEmail").GetString().Should().NotBeNullOrEmpty();
        entry.GetProperty("role").GetString().Should().Be("PL");
    }

    // AC 4: Rollenänderung per PATCH und Entfernen per DELETE spiegeln sich in
    // GET .../memberships wider (Rollen-Select bzw. Entfernen-Aktion je Mitgliedszeile).
    [Fact]
    public async Task AC4_ChangeRoleAndRemove_ReflectedInMembershipList()
    {
        var (projectId, userId) = await CreateProjectAndUserAsync();
        using var admin = AdminClient();
        await admin.PostAsJsonAsync($"/api/v1/admin/projects/{projectId}/memberships", new { userId, role = "Coreteam" });

        var patchResponse = await admin.PatchAsJsonAsync(
            $"/api/v1/admin/projects/{projectId}/memberships/{userId}", new { role = "Architect" });
        patchResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var afterPatch = await (await admin.GetAsync($"/api/v1/admin/projects/{projectId}/memberships"))
            .Content.ReadFromJsonAsync<JsonElement>();
        afterPatch.EnumerateArray().Single(m => m.GetProperty("userId").GetGuid() == userId)
            .GetProperty("role").GetString().Should().Be("Architect");

        var deleteResponse = await admin.DeleteAsync($"/api/v1/admin/projects/{projectId}/memberships/{userId}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var afterDelete = await (await admin.GetAsync($"/api/v1/admin/projects/{projectId}/memberships"))
            .Content.ReadFromJsonAsync<JsonElement>();
        afterDelete.EnumerateArray().Should().NotContain(m => m.GetProperty("userId").GetGuid() == userId);
    }

    // AC 5: Der Bereich ist ausschließlich für Systemadmins erreichbar — serverseitig durch die
    // SystemAdmin-Policy auf allen beteiligten Endpunkten erzwungen (die UI-Sichtbarkeit ist eine
    // clientseitige Ergänzung, siehe adminGuard, keine eigenständige Verteidigungslinie).
    [Fact]
    public async Task AC5_AllEndpoints_RejectNonAdmin_With403()
    {
        var (projectId, _) = await CreateProjectAndUserAsync();
        using var nonAdmin = NonAdminClient();

        (await nonAdmin.GetAsync("/api/v1/admin/projects")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await nonAdmin.GetAsync($"/api/v1/admin/projects/{projectId}/memberships")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    private async Task<(Guid ProjectId, Guid UserId)> CreateProjectAndUserAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        dbContext.Projects.Add(project);

        var user = User.Create("Zielnutzer", $"us017-{Guid.NewGuid():N}@example.com", "correct-horse");
        dbContext.Users.Add(user);

        await dbContext.SaveChangesAsync();

        return (project.Id, user.Id);
    }

    private HttpClient AdminClient() => AuthenticatedClient(isSystemAdmin: true);

    private HttpClient NonAdminClient() => AuthenticatedClient(isSystemAdmin: false);

    private HttpClient AuthenticatedClient(bool isSystemAdmin)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { [JwtSettings.SigningKeyConfigurationKey] = SigningKey })
            .Build();
        var token = new JwtTokenGenerator(configuration).GenerateToken(Guid.NewGuid(), isSystemAdmin);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}
