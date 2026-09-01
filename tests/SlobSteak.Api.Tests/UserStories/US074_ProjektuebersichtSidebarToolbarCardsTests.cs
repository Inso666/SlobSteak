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
/// Dedizierter Story-Test für US-074 (Projektübersicht: Sidebar-Icons/Nutzerkarte,
/// Toolbar-Tabs/Suche/Sortierung, Karten-Grundlayout) — ausschließlich der Backend-Anteil: die
/// additive Erweiterung von <c>ProjectOverviewItem</c>/<c>ProjectOverviewResponse</c> um
/// <c>Status</c> (Akzeptanzkriterium „Übergreifend": „Backend-Test (xUnit) belegt: Status korrekt
/// in ProjectOverviewResponse befüllt.") sowie das zugehörige, für das Sortierkriterium
/// „Neu zuerst" benötigte <c>CreatedAt</c>. Alle übrigen Akzeptanzkriterien dieser Story (Sidebar,
/// Toolbar, Karten) sind reine Frontend-/UI-Anteile und werden durch den Angular-`TestBed`-Story-Test
/// (<c>us-074-projektuebersicht-sidebar-toolbar-cards.spec.ts</c>) abgedeckt, siehe Story-Datei
/// Abschnitt „Übergreifend".
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US074_ProjektuebersichtSidebarToolbarCardsTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us074-story-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public US074_ProjektuebersichtSidebarToolbarCardsTests(PostgresContainerFixture postgres)
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

    // Akzeptanzkriterium „Übergreifend": Backend-Test belegt, dass Status korrekt in
    // ProjectOverviewResponse befüllt wird — hier für ein aktives Projekt.
    [Fact]
    public async Task GetMyProjects_ForActiveProject_ReturnsStatusActive()
    {
        Guid userId;
        Guid projectId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

            var user = User.Create("Zielnutzer", $"us074-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
            user.ChangePassword("correct-horse-battery-2");
            dbContext.Users.Add(user);
            userId = user.Id;

            var project = Project.Create("Aktives Projekt", null);
            project.AssignMember(userId, ProjectRole.PL);
            dbContext.Projects.Add(project);
            projectId = project.Id;

            await dbContext.SaveChangesAsync();
        }

        using var client = AuthenticatedClient(userId, isSystemAdmin: false);
        var response = await client.GetAsync("/api/v1/projects");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var projects = await response.Content.ReadFromJsonAsync<JsonElement>();
        var entry = projects.EnumerateArray().Single(p => p.GetProperty("id").GetGuid() == projectId);
        entry.GetProperty("status").GetString().Should().Be("Active");
    }

    // Akzeptanzkriterium „Übergreifend": Backend-Test belegt, dass Status korrekt in
    // ProjectOverviewResponse befüllt wird — Gegenprobe für ein archiviertes Projekt (steuert die
    // „Archiviert"-Kennzeichnung der Projektkarten im Frontend).
    [Fact]
    public async Task GetMyProjects_ForArchivedProject_ReturnsStatusArchived()
    {
        Guid userId;
        Guid projectId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

            var user = User.Create("Zielnutzer", $"us074-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
            user.ChangePassword("correct-horse-battery-2");
            dbContext.Users.Add(user);
            userId = user.Id;

            var project = Project.Create("Archiviertes Projekt", null);
            project.AssignMember(userId, ProjectRole.Coreteam);
            project.Archive();
            dbContext.Projects.Add(project);
            projectId = project.Id;

            await dbContext.SaveChangesAsync();
        }

        using var client = AuthenticatedClient(userId, isSystemAdmin: false);
        var response = await client.GetAsync("/api/v1/projects");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var projects = await response.Content.ReadFromJsonAsync<JsonElement>();
        var entry = projects.EnumerateArray().Single(p => p.GetProperty("id").GetGuid() == projectId);
        entry.GetProperty("status").GetString().Should().Be("Archived");
    }

    // Zusätzlich (nicht redundant mit dem obigen Kriterium): CreatedAt wird mitgeliefert — Basis
    // des im Frontend clientseitig umgesetzten Sortierkriteriums „Neu zuerst".
    [Fact]
    public async Task GetMyProjects_IncludesCreatedAt_ForClientSideNewestFirstSorting()
    {
        Guid userId;
        Guid projectId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

            var user = User.Create("Zielnutzer", $"us074-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
            user.ChangePassword("correct-horse-battery-2");
            dbContext.Users.Add(user);
            userId = user.Id;

            var project = Project.Create("Projekt mit Zeitstempel", null);
            project.AssignMember(userId, ProjectRole.Architect);
            dbContext.Projects.Add(project);
            projectId = project.Id;

            await dbContext.SaveChangesAsync();
        }

        using var client = AuthenticatedClient(userId, isSystemAdmin: false);
        var response = await client.GetAsync("/api/v1/projects");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var projects = await response.Content.ReadFromJsonAsync<JsonElement>();
        var entry = projects.EnumerateArray().Single(p => p.GetProperty("id").GetGuid() == projectId);
        entry.TryGetProperty("createdAt", out var createdAt).Should().BeTrue();
        createdAt.GetDateTimeOffset().Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromMinutes(1));
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
