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
using SlobSteak.Domain.Communications;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;
using SlobSteak.Infrastructure.Persistence;

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-041 (Verteilerlisten-Filter-Query-API inkl. Berechtigungsregel).
/// Prüft ausschließlich die in <c>docs/usecases/US-041-distribution-list-api.md</c> gelisteten
/// Akzeptanzkriterien, ein <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie im
/// Story-Dokument, über eine echte Testcontainers-PostgreSQL-Instanz — Konvention aus
/// <c>.claude/agents/qa.md</c> Abschnitt 1, analog zu <c>US031_MapQueryApiTests</c>. Ergänzend dazu
/// deckt <c>DistributionLists/DistributionListControllerTests.cs</c> Response-Contract-Details und
/// weitere Randfälle ab, die über die Akzeptanzkriterien hinausgehen.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US041_DistributionListApiTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us041-story-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public US041_DistributionListApiTests(PostgresContainerFixture postgres)
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

    // AC 1: GET /api/v1/projects/{projectId}/distribution-list?communicationTypeId=&frequency=&channel=&stakeholderType=
    // liefert eine Liste aktiver Stakeholder mit Name/E-Mail/zugeordneter Kommunikationsart/
    // Frequenz/Kanal, gefiltert nach den übergebenen Kriterien (beliebige Kombination, alle
    // optional).
    [Fact]
    public async Task AC1_Get_FiltersByAnyCombinationOfCriteria_ReturnsMatchingEntries()
    {
        var (projectId, plUserId, newsletterId, statusReportId) = await CreateProjectWithCatalogAsync();

        Guid annaId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var anna = Stakeholder.Create(projectId, StakeholderType.Person, "Anna", null, null, "anna@example.com", null, null, null, plUserId);
            anna.AssignCommunication(newsletterId, CommunicationFrequency.Monthly, CommunicationChannel.Email);
            anna.AssignCommunication(statusReportId, CommunicationFrequency.Weekly, CommunicationChannel.Report);
            var tom = Stakeholder.Create(projectId, StakeholderType.Organization, "ACME GmbH", null, null, "info@acme.example", null, null, null, plUserId);
            tom.AssignCommunication(newsletterId, CommunicationFrequency.Weekly, CommunicationChannel.Meeting);
            dbContext.Stakeholders.AddRange(anna, tom);
            await dbContext.SaveChangesAsync();
            annaId = anna.Id;
        }

        using var client = AuthenticatedClient(plUserId);

        // Kombination Kommunikationsart + Frequenz + Kanal + Typ ergibt genau einen Treffer.
        var response = await client.GetAsync(
            $"/api/v1/projects/{projectId}/distribution-list?communicationTypeId={newsletterId}&frequency=Monthly&channel=Email&stakeholderType=Person");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetArrayLength().Should().Be(1);
        var entry = body[0];
        entry.GetProperty("stakeholderId").GetGuid().Should().Be(annaId);
        entry.GetProperty("name").GetString().Should().Be("Anna");
        entry.GetProperty("email").GetString().Should().Be("anna@example.com");
        entry.GetProperty("communicationTypeId").GetGuid().Should().Be(newsletterId);
        entry.GetProperty("frequency").GetString().Should().Be("Monthly");
        entry.GetProperty("channel").GetString().Should().Be("Email");
    }

    // AC 2: Endpoint ist ausschließlich für PL/Coreteam erreichbar; für Architect und User liefert
    // er 403 Forbidden (Architect ist hier bewusst NICHT erlaubt, im Unterschied zu US-040).
    [Theory]
    [InlineData(ProjectRole.PL, HttpStatusCode.OK)]
    [InlineData(ProjectRole.Coreteam, HttpStatusCode.OK)]
    [InlineData(ProjectRole.Architect, HttpStatusCode.Forbidden)]
    [InlineData(ProjectRole.User, HttpStatusCode.Forbidden)]
    public async Task AC2_RoleAuthorization_OnlyPlAndCoreteamAllowed(ProjectRole role, HttpStatusCode expectedStatus)
    {
        var (projectId, userId) = await CreateProjectWithMemberAsync(role);
        using var client = AuthenticatedClient(userId);

        var response = await client.GetAsync($"/api/v1/projects/{projectId}/distribution-list");

        response.StatusCode.Should().Be(expectedStatus);
    }

    // AC 3: Soft-gelöschte Stakeholder erscheinen nie im Ergebnis, auch nicht kurz nach dem Löschen
    // — verschwinden nach dem Löschen, tauchen nach Wiederherstellung wieder auf (Kette zu
    // US-023/US-024).
    [Fact]
    public async Task AC3_SoftDeletedStakeholder_DisappearsImmediately_ReappearsAfterRestore()
    {
        var (projectId, plUserId, newsletterId, _) = await CreateProjectWithCatalogAsync();

        Guid stakeholderId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var stakeholder = Stakeholder.Create(projectId, StakeholderType.Person, "Löschbar", null, null, "loeschbar@example.com", null, null, null, plUserId);
            stakeholder.AssignCommunication(newsletterId, CommunicationFrequency.Monthly, CommunicationChannel.Email);
            dbContext.Stakeholders.Add(stakeholder);
            await dbContext.SaveChangesAsync();
            stakeholderId = stakeholder.Id;
        }

        using var client = AuthenticatedClient(plUserId);

        var beforeDeleteResponse = await client.GetAsync($"/api/v1/projects/{projectId}/distribution-list");
        (await beforeDeleteResponse.Content.ReadFromJsonAsync<JsonElement>()).GetArrayLength().Should().Be(1);

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var stakeholder = await dbContext.Stakeholders.SingleAsync(s => s.Id == stakeholderId);
            stakeholder.SoftDelete(plUserId);
            await dbContext.SaveChangesAsync();
        }

        var afterDeleteResponse = await client.GetAsync($"/api/v1/projects/{projectId}/distribution-list");
        afterDeleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        (await afterDeleteResponse.Content.ReadFromJsonAsync<JsonElement>()).GetArrayLength().Should().Be(0);

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var stakeholder = await dbContext.Stakeholders.SingleAsync(s => s.Id == stakeholderId);
            stakeholder.Restore();
            await dbContext.SaveChangesAsync();
        }

        var afterRestoreResponse = await client.GetAsync($"/api/v1/projects/{projectId}/distribution-list");
        afterRestoreResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var afterRestoreBody = await afterRestoreResponse.Content.ReadFromJsonAsync<JsonElement>();
        afterRestoreBody.GetArrayLength().Should().Be(1);
        afterRestoreBody[0].GetProperty("stakeholderId").GetGuid().Should().Be(stakeholderId);
    }

    // AC 4: Stakeholder ohne hinterlegte E-Mail-Adresse sind im Ergebnis enthalten, mit explizitem
    // Feld hasEmail: false.
    [Fact]
    public async Task AC4_StakeholderWithoutEmail_IsIncluded_WithHasEmailFalse()
    {
        var (projectId, plUserId, newsletterId, _) = await CreateProjectWithCatalogAsync();

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var stakeholder = Stakeholder.Create(projectId, StakeholderType.Person, "Ohne E-Mail", null, null, null, null, null, null, plUserId);
            stakeholder.AssignCommunication(newsletterId, CommunicationFrequency.Monthly, CommunicationChannel.Email);
            dbContext.Stakeholders.Add(stakeholder);
            await dbContext.SaveChangesAsync();
        }

        using var client = AuthenticatedClient(plUserId);
        var response = await client.GetAsync($"/api/v1/projects/{projectId}/distribution-list");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetArrayLength().Should().Be(1);
        body[0].GetProperty("hasEmail").GetBoolean().Should().BeFalse();
        body[0].GetProperty("email").ValueKind.Should().Be(JsonValueKind.Null);
    }

    // AC 5: Leeres Filterergebnis liefert 200 OK mit leerem Array (kein 404).
    [Fact]
    public async Task AC5_EmptyFilterResult_ReturnsOkWithEmptyArray()
    {
        var (projectId, plUserId, _, _) = await CreateProjectWithCatalogAsync();
        using var client = AuthenticatedClient(plUserId);

        var response = await client.GetAsync($"/api/v1/projects/{projectId}/distribution-list");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.ValueKind.Should().Be(JsonValueKind.Array);
        body.GetArrayLength().Should().Be(0);
    }

    /// <summary>Erstellt ein Projekt mit PL-Mitgliedschaft sowie zwei aktive Katalogeinträge
    /// ("Newsletter", "Statusbericht").</summary>
    private async Task<(Guid ProjectId, Guid PlUserId, Guid NewsletterId, Guid StatusReportId)> CreateProjectWithCatalogAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var plUser = User.Create("PL Nutzer", $"us041-pl-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        plUser.ChangePassword("correct-horse-battery-2");
        dbContext.Users.Add(plUser);

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        project.AssignMember(plUser.Id, ProjectRole.PL);
        dbContext.Projects.Add(project);

        var newsletter = CommunicationType.Create($"Newsletter-{Guid.NewGuid():N}");
        var statusReport = CommunicationType.Create($"Statusbericht-{Guid.NewGuid():N}");
        dbContext.AddRange(newsletter, statusReport);

        await dbContext.SaveChangesAsync();

        return (project.Id, plUser.Id, newsletter.Id, statusReport.Id);
    }

    private async Task<(Guid ProjectId, Guid UserId)> CreateProjectWithMemberAsync(ProjectRole role)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var user = User.Create($"Nutzer-{Guid.NewGuid():N}", $"us041-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
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
