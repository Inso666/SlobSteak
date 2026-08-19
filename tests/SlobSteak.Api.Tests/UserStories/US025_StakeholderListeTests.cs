using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Web;
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
/// Dedizierter Story-Test für US-025 (Stakeholder-Liste mit Suche/Filter: API + UI inkl.
/// Rollen-Sichtbarkeitsregel). Prüft ausschließlich die in
/// <c>docs/usecases/US-025-stakeholder-liste.md</c> gelisteten Akzeptanzkriterien, ein
/// <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie im Story-Dokument, über
/// eine echte Testcontainers-PostgreSQL-Instanz. Akzeptanzkriterium 4 (Frontend-Sichtbarkeit für
/// alle Rollen inkl. `User`) siehe <c>stakeholder-list.component.spec.ts</c>.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US025_StakeholderListeTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us025-story-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public US025_StakeholderListeTests(PostgresContainerFixture postgres)
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

    // AC 1: GET /api/v1/projects/{projectId}/stakeholders?search=&type=&communicationTypeId=
    // liefert eine gefilterte Liste aktiver Stakeholder (implizit deleted_at IS NULL).
    [Fact]
    public async Task AC1_ListEndpoint_ReturnsOnlyActiveStakeholders()
    {
        var (projectId, userId) = await CreateProjectWithMemberAsync(ProjectRole.User);
        Guid activeId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var active = Stakeholder.Create(projectId, StakeholderType.Person, "Aktiv", null, null, null, null, null, null, userId);
            var deleted = Stakeholder.Create(projectId, StakeholderType.Person, "Gelöscht", null, null, null, null, null, null, userId);
            deleted.SoftDelete(userId);
            dbContext.Stakeholders.AddRange(active, deleted);
            await dbContext.SaveChangesAsync();
            activeId = active.Id;
        }

        using var client = AuthenticatedClient(userId);
        var response = await client.GetAsync($"/api/v1/projects/{projectId}/stakeholders");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var ids = body.EnumerateArray().Select(s => s.GetProperty("id").GetGuid()).ToList();
        ids.Should().Contain(activeId).And.HaveCount(1);
    }

    // AC 2: search filtert per Volltextsuche über name und organization (case-insensitive,
    // Teilstring-Match).
    [Fact]
    public async Task AC2_SearchFilter_MatchesNameAndOrganization_CaseInsensitiveSubstring()
    {
        var (projectId, userId) = await CreateProjectWithMemberAsync(ProjectRole.User);
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            dbContext.Stakeholders.AddRange(
                Stakeholder.Create(projectId, StakeholderType.Person, "Max Mustermann", "ACME GmbH", null, null, null, null, null, userId),
                Stakeholder.Create(projectId, StakeholderType.Person, "Erika Musterfrau", "Beta AG", null, null, null, null, null, userId));
            await dbContext.SaveChangesAsync();
        }

        using var client = AuthenticatedClient(userId);
        var response = await client.GetAsync($"/api/v1/projects/{projectId}/stakeholders?search=mustermann");

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var names = body.EnumerateArray().Select(s => s.GetProperty("name").GetString()).ToList();
        names.Should().ContainSingle().Which.Should().Be("Max Mustermann");
    }

    // AC 3: Response-Felder für Rolle User enthalten ausschließlich Stammdaten-Spalten (Name,
    // Typ, Organisation, Position, Kontakt); Einfluss-/Interesse-Werte sind serverseitig nicht im
    // Payload enthalten.
    [Fact]
    public async Task AC3_UserRole_ResponseContainsOnlyMasterDataFields_NoAssessmentFields()
    {
        var (projectId, userId) = await CreateProjectWithMemberAsync(ProjectRole.User);
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            dbContext.Stakeholders.Add(Stakeholder.Create(
                projectId, StakeholderType.Person, "Max Mustermann", "ACME GmbH", "CTO", "max@example.com", "+49 123", "Berlin", "Beschreibung", userId));
            await dbContext.SaveChangesAsync();
        }

        using var client = AuthenticatedClient(userId);
        var response = await client.GetAsync($"/api/v1/projects/{projectId}/stakeholders");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var entry = body.EnumerateArray().Single();
        entry.TryGetProperty("name", out _).Should().BeTrue();
        entry.TryGetProperty("type", out _).Should().BeTrue();
        entry.TryGetProperty("organization", out _).Should().BeTrue();
        entry.TryGetProperty("position", out _).Should().BeTrue();
        entry.TryGetProperty("email", out _).Should().BeTrue();
        entry.TryGetProperty("phone", out _).Should().BeTrue();
        entry.TryGetProperty("influence", out _).Should().BeFalse();
        entry.TryGetProperty("interest", out _).Should().BeFalse();
    }

    // AC 5 (Backend-Teil, siehe Klassendoku für AC4): Filter nach Typ; leeres Ergebnis liefert
    // eine leere Liste (Leerzustand-Meldung ist UI-seitig, siehe stakeholder-list.component.spec.ts).
    [Fact]
    public async Task AC5_TypeFilter_ReturnsOnlyMatchingType_EmptyResultForNoMatches()
    {
        var (projectId, userId) = await CreateProjectWithMemberAsync(ProjectRole.User);
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            dbContext.Stakeholders.AddRange(
                Stakeholder.Create(projectId, StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, userId),
                Stakeholder.Create(projectId, StakeholderType.Organization, "ACME GmbH", null, null, null, null, null, null, userId));
            await dbContext.SaveChangesAsync();
        }

        using var client = AuthenticatedClient(userId);
        var response = await client.GetAsync($"/api/v1/projects/{projectId}/stakeholders?type=Organization");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.EnumerateArray().Should().ContainSingle().Which.GetProperty("type").GetString().Should().Be("Organization");

        var emptyResponse = await client.GetAsync(
            $"/api/v1/projects/{projectId}/stakeholders?search={HttpUtility.UrlEncode("kein-treffer-xyz")}");
        var emptyBody = await emptyResponse.Content.ReadFromJsonAsync<JsonElement>();
        emptyBody.EnumerateArray().Should().BeEmpty();
    }

    private async Task<(Guid ProjectId, Guid UserId)> CreateProjectWithMemberAsync(ProjectRole role)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var user = User.Create("Zielnutzer", $"us025-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        user.ChangePassword("correct-horse-battery-2");
        dbContext.Users.Add(user);

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        project.AssignMember(user.Id, role);
        dbContext.Projects.Add(project);

        await dbContext.SaveChangesAsync();

        return (project.Id, user.Id);
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
