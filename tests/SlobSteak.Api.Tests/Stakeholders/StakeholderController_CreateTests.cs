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
using SlobSteak.Infrastructure.Persistence;

namespace SlobSteak.Api.Tests.Stakeholders;

/// <summary>
/// Integrationstests für <c>POST /api/v1/projects/{projectId}/stakeholders</c> (US-021) über eine
/// echte Testcontainers-PostgreSQL-Instanz — ergänzend zum dedizierten Story-Test
/// <c>US021_StakeholderAnlegenTests</c>: hier liegt der Fokus auf Details des Response-Contracts
/// und Randfällen (ungültiger <c>type</c>, fehlendes Token, Organization ohne Position), nicht auf
/// den Akzeptanzkriterien selbst.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class StakeholderController_CreateTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-stakeholder-controller-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public StakeholderController_CreateTests(PostgresContainerFixture postgres)
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
    public async Task CreateStakeholder_ValidRequest_ReturnsCamelCaseBodyWithAllExpectedFields()
    {
        var (projectId, userId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        using var client = AuthenticatedClient(userId);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/projects/{projectId}/stakeholders", new { name = "Max Mustermann", type = "Person" });

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("id", out _).Should().BeTrue();
        body.TryGetProperty("projectId", out _).Should().BeTrue();
        body.TryGetProperty("type", out _).Should().BeTrue();
        body.TryGetProperty("name", out _).Should().BeTrue();
        body.TryGetProperty("organization", out _).Should().BeTrue();
        body.TryGetProperty("position", out _).Should().BeTrue();
        body.TryGetProperty("email", out _).Should().BeTrue();
        body.TryGetProperty("phone", out _).Should().BeTrue();
        body.TryGetProperty("locationDepartment", out _).Should().BeTrue();
        body.TryGetProperty("description", out _).Should().BeTrue();
        body.TryGetProperty("similarStakeholderWarning", out _).Should().BeTrue();
        body.GetProperty("similarStakeholderWarning").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task CreateStakeholder_OrganizationTypeWithoutPosition_Succeeds()
    {
        var (projectId, userId) = await CreateProjectWithMemberAsync(ProjectRole.Coreteam);
        using var client = AuthenticatedClient(userId);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/projects/{projectId}/stakeholders", new { name = "ACME GmbH", type = "Organization" });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("type").GetString().Should().Be("Organization");
        body.GetProperty("position").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task CreateStakeholder_InvalidType_Returns400_WithInvalidTypeError()
    {
        var (projectId, userId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        using var client = AuthenticatedClient(userId);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/projects/{projectId}/stakeholders", new { name = "Max Mustermann", type = "Unbekannt" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("error").GetString().Should().Be("INVALID_TYPE");
    }

    [Fact]
    public async Task CreateStakeholder_WithoutToken_Returns401()
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            $"/api/v1/projects/{Guid.NewGuid()}/stakeholders", new { name = "Max Mustermann", type = "Person" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateStakeholder_ForNonExistentProject_Returns403_NotLeakingProjectExistence()
    {
        // Ohne Mitgliedschaft (auch weil das Projekt gar nicht existiert) verweigert die
        // ProjectRole-Policy — konsistent mit dem Verhalten für ein existierendes Projekt ohne
        // eigene Mitgliedschaft, kein separates 404 (kein Existenz-Leak über den Statuscode).
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { [JwtSettings.SigningKeyConfigurationKey] = SigningKey })
            .Build();
        var token = new JwtTokenGenerator(configuration).GenerateToken(Guid.NewGuid(), isSystemAdmin: false);
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/projects/{Guid.NewGuid()}/stakeholders", new { name = "Max Mustermann", type = "Person" });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    private async Task<(Guid ProjectId, Guid UserId)> CreateProjectWithMemberAsync(ProjectRole role)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var user = User.Create("Zielnutzer", $"stakeholder-controller-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
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
