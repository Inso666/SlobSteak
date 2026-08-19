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

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-021 (Stakeholder anlegen: API + Formular-UI). Prüft ausschließlich
/// die in <c>docs/usecases/US-021-stakeholder-anlegen.md</c> gelisteten Akzeptanzkriterien, ein
/// <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie im Story-Dokument, über
/// eine echte Testcontainers-PostgreSQL-Instanz. Akzeptanzkriterium 5/6 betreffen die
/// Angular-Oberfläche (siehe <c>create-stakeholder-form.component.spec.ts</c>).
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US021_StakeholderAnlegenTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us021-story-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public US021_StakeholderAnlegenTests(PostgresContainerFixture postgres)
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

    // AC 1: POST /api/v1/projects/{projectId}/stakeholders mit name, type (Pflicht) sowie
    // optionalen Feldern liefert 201 Created.
    [Fact]
    public async Task AC1_ValidRequest_Returns201Created()
    {
        var (projectId, userId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        using var client = AuthenticatedClient(userId);

        var response = await client.PostAsJsonAsync($"/api/v1/projects/{projectId}/stakeholders", new
        {
            name = "Max Mustermann",
            type = "Person",
            organization = "ACME GmbH",
            position = "CTO",
            email = "max@example.com",
            phone = "+49 123",
            locationDepartment = "Berlin",
            description = "Beschreibung",
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("name").GetString().Should().Be("Max Mustermann");
        body.GetProperty("projectId").GetGuid().Should().Be(projectId);
    }

    // AC 2: Endpoint ist für Rollen PL, Coreteam, Architect erreichbar, für User liefert er
    // 403 Forbidden.
    [Theory]
    [InlineData(ProjectRole.PL)]
    [InlineData(ProjectRole.Coreteam)]
    [InlineData(ProjectRole.Architect)]
    public async Task AC2_AllowedRoles_CanCreateStakeholder(ProjectRole role)
    {
        var (projectId, userId) = await CreateProjectWithMemberAsync(role);
        using var client = AuthenticatedClient(userId);

        var response = await client.PostAsJsonAsync($"/api/v1/projects/{projectId}/stakeholders", new { name = "Max Mustermann", type = "Person" });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task AC2_UserRole_Returns403Forbidden()
    {
        var (projectId, userId) = await CreateProjectWithMemberAsync(ProjectRole.User);
        using var client = AuthenticatedClient(userId);

        var response = await client.PostAsJsonAsync($"/api/v1/projects/{projectId}/stakeholders", new { name = "Max Mustermann", type = "Person" });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // AC 3: Ungültiges email-Format liefert 400 mit {"error":"INVALID_EMAIL_FORMAT"}; leeres name
    // liefert 400 mit {"error":"NAME_REQUIRED"}.
    [Fact]
    public async Task AC3_InvalidEmail_Returns400_WithInvalidEmailFormatError()
    {
        var (projectId, userId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        using var client = AuthenticatedClient(userId);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/projects/{projectId}/stakeholders", new { name = "Max Mustermann", type = "Person", email = "keine-email" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("error").GetString().Should().Be("INVALID_EMAIL_FORMAT");
    }

    [Fact]
    public async Task AC3_BlankName_Returns400_WithNameRequiredError()
    {
        var (projectId, userId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        using var client = AuthenticatedClient(userId);

        var response = await client.PostAsJsonAsync($"/api/v1/projects/{projectId}/stakeholders", new { name = "   ", type = "Person" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("error").GetString().Should().Be("NAME_REQUIRED");
    }

    // AC 4: Existiert im selben Projekt bereits ein aktiver Stakeholder mit ähnlichem/identischem
    // Namen, liefert die Response zusätzlich ein nicht-blockierendes Feld
    // similarStakeholderWarning mit dessen Name/ID (Speichern wird nicht blockiert).
    [Fact]
    public async Task AC4_SimilarNameExists_ReturnsSimilarStakeholderWarning_ButStillCreates()
    {
        var (projectId, userId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        using var client = AuthenticatedClient(userId);
        var firstResponse = await client.PostAsJsonAsync($"/api/v1/projects/{projectId}/stakeholders", new { name = "Max Mustermann", type = "Person" });
        var firstId = (await firstResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var response = await client.PostAsJsonAsync($"/api/v1/projects/{projectId}/stakeholders", new { name = "max mustermann", type = "Person" });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("similarStakeholderWarning").GetProperty("id").GetGuid().Should().Be(firstId);
        body.GetProperty("similarStakeholderWarning").GetProperty("name").GetString().Should().Be("Max Mustermann");
    }

    private async Task<(Guid ProjectId, Guid UserId)> CreateProjectWithMemberAsync(ProjectRole role)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var user = User.Create("Zielnutzer", $"us021-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
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
