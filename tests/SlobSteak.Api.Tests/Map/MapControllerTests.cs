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

namespace SlobSteak.Api.Tests.Map;

/// <summary>
/// Integrationstests für <c>GET /api/v1/projects/{projectId}/map</c> (US-031) sowie
/// <c>GET .../map/compare</c> (US-033) über eine echte Testcontainers-PostgreSQL-Instanz —
/// ergänzend zu den dedizierten Story-Tests <c>US031_MapQueryApiTests</c>/
/// <c>US033_MapComparisonApiTests</c>: hier liegt der Fokus auf Details des Response-Contracts und
/// Randfällen (ungültiger <c>perspective</c>-/<c>primary</c>-/<c>secondary</c>-Wert, Rolle
/// <c>User</c> als Perspektivwert, fehlendes Token, Projekt-Isolation), nicht auf den
/// Akzeptanzkriterien selbst.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class MapControllerTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-map-controller-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public MapControllerTests(PostgresContainerFixture postgres)
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

    [Fact]
    public async Task GetMap_UnknownPerspectiveValue_ReturnsBadRequest()
    {
        var (projectId, plUserId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        using var client = AuthenticatedClient(plUserId);

        var response = await client.GetAsync($"/api/v1/projects/{projectId}/map?perspective=NichtExistent");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("error").GetString().Should().Be("INVALID_PERSPECTIVE");
    }

    [Fact]
    public async Task GetMap_PerspectiveUser_ReturnsBadRequest()
    {
        // "User" ist syntaktisch ein gültiger ProjectRole-Enum-Wert, aber fachlich keine
        // Perspektive (nur PL/Coreteam/Architect tragen laut Akzeptanzkriterium 1 ein Assessment) —
        // muss daher trotz gültigem Enum-Namen als 400 abgelehnt werden, nicht als leere Liste.
        var (projectId, plUserId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        using var client = AuthenticatedClient(plUserId);

        var response = await client.GetAsync($"/api/v1/projects/{projectId}/map?perspective=User");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetMap_NoToken_ReturnsUnauthorized()
    {
        var (projectId, _) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        using var client = _factory.CreateClient();

        var response = await client.GetAsync($"/api/v1/projects/{projectId}/map?perspective=PL");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetMap_PerspectiveIsCaseInsensitive()
    {
        var (projectId, plUserId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        var stakeholder = Stakeholder.Create(projectId, StakeholderType.Person, "Klein Geschrieben", null, null, null, null, null, null, plUserId);
        dbContext.Stakeholders.Add(stakeholder);
        dbContext.StakeholderAssessments.Add(StakeholderAssessment.Create(stakeholder.Id, ProjectRole.PL, 10, 20, null, plUserId));
        await dbContext.SaveChangesAsync();

        using var client = AuthenticatedClient(plUserId);
        var response = await client.GetAsync($"/api/v1/projects/{projectId}/map?perspective=pl");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetArrayLength().Should().Be(1);
    }

    [Fact]
    public async Task GetMap_OtherProjectsStakeholders_AreNotIncluded()
    {
        var (projectId, plUserId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        var (otherProjectId, otherPlUserId) = await CreateProjectWithMemberAsync(ProjectRole.PL);

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var otherStakeholder = Stakeholder.Create(
                otherProjectId, StakeholderType.Person, "Fremdes Projekt", null, null, null, null, null, null, otherPlUserId);
            dbContext.Stakeholders.Add(otherStakeholder);
            dbContext.StakeholderAssessments.Add(StakeholderAssessment.Create(otherStakeholder.Id, ProjectRole.PL, 50, 50, null, otherPlUserId));
            await dbContext.SaveChangesAsync();
        }

        using var client = AuthenticatedClient(plUserId);
        var response = await client.GetAsync($"/api/v1/projects/{projectId}/map?perspective=PL");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task GetComparison_UnknownPrimaryValue_ReturnsBadRequest()
    {
        var (projectId, plUserId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        using var client = AuthenticatedClient(plUserId);

        var response = await client.GetAsync($"/api/v1/projects/{projectId}/map/compare?primary=NichtExistent&secondary=Coreteam");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("error").GetString().Should().Be("INVALID_PERSPECTIVE");
    }

    [Fact]
    public async Task GetComparison_UnknownSecondaryValue_ReturnsBadRequest()
    {
        var (projectId, plUserId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        using var client = AuthenticatedClient(plUserId);

        var response = await client.GetAsync($"/api/v1/projects/{projectId}/map/compare?primary=PL&secondary=NichtExistent");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetComparison_MissingPrimaryOrSecondary_ReturnsBadRequest()
    {
        var (projectId, plUserId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        using var client = AuthenticatedClient(plUserId);

        var response = await client.GetAsync($"/api/v1/projects/{projectId}/map/compare?primary=PL");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetComparison_PrimaryOrSecondaryIsUser_ReturnsBadRequest()
    {
        // "User" ist syntaktisch ein gültiger ProjectRole-Enum-Wert, aber fachlich keine
        // Perspektive — analog zu GetMap_PerspectiveUser_ReturnsBadRequest (US-031).
        var (projectId, plUserId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        using var client = AuthenticatedClient(plUserId);

        var response = await client.GetAsync($"/api/v1/projects/{projectId}/map/compare?primary=User&secondary=PL");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetComparison_NoToken_ReturnsUnauthorized()
    {
        var (projectId, _) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        using var client = _factory.CreateClient();

        var response = await client.GetAsync($"/api/v1/projects/{projectId}/map/compare?primary=PL&secondary=Coreteam");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetComparison_PerspectivesAreCaseInsensitive()
    {
        var (projectId, plUserId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        var stakeholder = Stakeholder.Create(projectId, StakeholderType.Person, "Klein Geschrieben", null, null, null, null, null, null, plUserId);
        dbContext.Stakeholders.Add(stakeholder);
        dbContext.StakeholderAssessments.Add(StakeholderAssessment.Create(stakeholder.Id, ProjectRole.PL, 10, 20, null, plUserId));
        await dbContext.SaveChangesAsync();

        using var client = AuthenticatedClient(plUserId);
        var response = await client.GetAsync($"/api/v1/projects/{projectId}/map/compare?primary=pl&secondary=coreteam");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetArrayLength().Should().Be(1);
    }

    [Fact]
    public async Task GetComparison_OtherProjectsStakeholders_AreNotIncluded()
    {
        var (projectId, plUserId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        var (otherProjectId, otherPlUserId) = await CreateProjectWithMemberAsync(ProjectRole.PL);

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var otherStakeholder = Stakeholder.Create(
                otherProjectId, StakeholderType.Person, "Fremdes Projekt", null, null, null, null, null, null, otherPlUserId);
            dbContext.Stakeholders.Add(otherStakeholder);
            dbContext.StakeholderAssessments.Add(StakeholderAssessment.Create(otherStakeholder.Id, ProjectRole.PL, 50, 50, null, otherPlUserId));
            await dbContext.SaveChangesAsync();
        }

        using var client = AuthenticatedClient(plUserId);
        var response = await client.GetAsync($"/api/v1/projects/{projectId}/map/compare?primary=PL&secondary=Coreteam");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetArrayLength().Should().Be(0);
    }

    private async Task<(Guid ProjectId, Guid UserId)> CreateProjectWithMemberAsync(ProjectRole role)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var user = User.Create($"Nutzer-{Guid.NewGuid():N}", $"map-controller-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
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
