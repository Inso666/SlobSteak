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
/// Dedizierter Story-Test für US-026 (Stakeholder-Detailseite Shell, Screen S4). Prüft
/// ausschließlich die in <c>docs/usecases/US-026-stakeholder-detail-shell.md</c> gelisteten
/// Akzeptanzkriterien, ein <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie
/// im Story-Dokument, über eine echte Testcontainers-PostgreSQL-Instanz. Akzeptanzkriterium 2
/// (Bearbeitbarkeit nur für PL/Coreteam/Architect, read-only für User) und 3 (Platzhalter-Slots)
/// und 4 (Löschen-CTA nur PL/Admin mit PL-Zuweisung sichtbar) sind reine UI-Sichtbarkeitsregeln
/// ohne eigenes Backend-Verhalten (der neue <c>GET</c>-Endpoint liefert dieselben Daten an alle
/// vier Rollen, das Bearbeiten läuft unverändert über den seit US-022 rollen-beschränkten
/// <c>PATCH</c>-Endpoint) — geprüft in <c>stakeholder-detail.component.spec.ts</c>. Hier daher nur
/// Akzeptanzkriterium 1 (Kopfbereich-Daten inkl. „zuletzt geändert von/am“, für alle Rollen lesbar)
/// und Akzeptanzkriterium 5 (Nicht-gefunden für soft-gelöschte Stakeholder).
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US026_StakeholderDetailShellTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us026-story-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public US026_StakeholderDetailShellTests(PostgresContainerFixture postgres)
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

    // AC 1: Route/Modal S4 zeigt Kopfbereich mit Name, Typ, Organisation und „zuletzt geändert
    // von/am“ aus US-022 — für jede der vier Projektrollen lesbar (Akzeptanzkriterium 2 erlaubt
    // Lesezugriff für alle, nur Bearbeiten ist eingeschränkt).
    [Theory]
    [InlineData(ProjectRole.PL)]
    [InlineData(ProjectRole.Coreteam)]
    [InlineData(ProjectRole.Architect)]
    [InlineData(ProjectRole.User)]
    public async Task AC1_GetStakeholder_ReturnsHeaderFields_ForEveryProjectRole(ProjectRole role)
    {
        var (projectId, userId) = await CreateProjectWithMemberAsync(role);
        Guid stakeholderId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var stakeholder = Stakeholder.Create(
                projectId, StakeholderType.Person, "Max Mustermann", "ACME GmbH", "CTO", null, null, null, null, userId);
            dbContext.Stakeholders.Add(stakeholder);
            await dbContext.SaveChangesAsync();
            stakeholderId = stakeholder.Id;
        }

        using var client = AuthenticatedClient(userId);
        var response = await client.GetAsync($"/api/v1/stakeholders/{stakeholderId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("name").GetString().Should().Be("Max Mustermann");
        body.GetProperty("type").GetString().Should().Be("Person");
        body.GetProperty("organization").GetString().Should().Be("ACME GmbH");
        body.GetProperty("updatedByName").GetString().Should().NotBeNullOrEmpty();
        body.GetProperty("updatedAt").GetDateTimeOffset().Should().NotBe(default);
    }

    // AC 5: Aufruf der Route mit der ID eines soft-gelöschten Stakeholders liefert eine
    // „Nicht gefunden“-Ansicht (konsistent mit 404 aus US-022/US-023).
    [Fact]
    public async Task AC5_GetStakeholder_SoftDeletedStakeholder_ReturnsNotFound()
    {
        var (projectId, userId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        Guid stakeholderId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var stakeholder = Stakeholder.Create(projectId, StakeholderType.Person, "Gelöscht", null, null, null, null, null, null, userId);
            stakeholder.SoftDelete(userId);
            dbContext.Stakeholders.Add(stakeholder);
            await dbContext.SaveChangesAsync();
            stakeholderId = stakeholder.Id;
        }

        using var client = AuthenticatedClient(userId);
        var response = await client.GetAsync($"/api/v1/stakeholders/{stakeholderId}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    private async Task<(Guid ProjectId, Guid UserId)> CreateProjectWithMemberAsync(ProjectRole role)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var user = User.Create("Zielnutzer", $"us026-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
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
