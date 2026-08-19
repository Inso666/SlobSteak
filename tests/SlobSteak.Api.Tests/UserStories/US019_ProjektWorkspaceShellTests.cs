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
/// Dedizierter Story-Test für US-019 (Projekt-Workspace-Shell mit Tab-Navigation, S3). Die
/// Akzeptanzkriterien sind fast vollständig clientseitig (Header/Rollen-Badge, Tab-Sichtbarkeit,
/// „Kein Zugriff“-Ansicht) — siehe <c>role.guard.spec.ts</c> und
/// <c>project-workspace-layout.component.spec.ts</c> für die dortige Abdeckung. Hier wird das
/// neue Backend-Fundament geprüft, auf dem Header (Akzeptanzkriterium 1) und `roleGuard`
/// (Akzeptanzkriterium 5) aufsetzen: <c>GET /api/v1/projects/{projectId}</c>.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US019_ProjektWorkspaceShellTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us019-story-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public US019_ProjektWorkspaceShellTests(PostgresContainerFixture postgres)
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

    // AC 1 (Fundament): GET /api/v1/projects/{projectId} liefert Projektname und eigene Rolle für
    // den Header/Rollen-Badge der Workspace-Shell.
    [Fact]
    public async Task AC1_GetSingleProject_ReturnsNameAndOwnRole_ForMember()
    {
        Guid userId;
        Guid projectId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

            var user = User.Create("Zielnutzer", $"us019-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
            user.ChangePassword("correct-horse-battery-2");
            dbContext.Users.Add(user);
            userId = user.Id;

            var project = Project.Create("Workspace-Projekt", null);
            project.AssignMember(userId, ProjectRole.Coreteam);
            dbContext.Projects.Add(project);
            projectId = project.Id;

            await dbContext.SaveChangesAsync();
        }

        using var client = AuthenticatedClient(userId, isSystemAdmin: false);
        var response = await client.GetAsync($"/api/v1/projects/{projectId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("name").GetString().Should().Be("Workspace-Projekt");
        body.GetProperty("role").GetString().Should().Be("Coreteam");
    }

    // AC 5 (Fundament): Ohne eigene Mitgliedschaft liefert der Endpoint 404 — Grundlage dafür,
    // dass roleGuard in diesem Fall auf die „Kein Zugriff“-Ansicht umleitet.
    [Fact]
    public async Task AC5_GetSingleProject_ReturnsNotFound_ForNonMember()
    {
        Guid projectId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var project = Project.Create($"Fremdes Projekt {Guid.NewGuid():N}", null);
            dbContext.Projects.Add(project);
            await dbContext.SaveChangesAsync();
            projectId = project.Id;
        }

        using var client = AuthenticatedClient(Guid.NewGuid(), isSystemAdmin: false);
        var response = await client.GetAsync($"/api/v1/projects/{projectId}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
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
