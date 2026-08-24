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
/// Dedizierter Story-Test für US-030 (Server-seitige Sichtbarkeitsregel für Rolle User auf
/// Assessment-Daten). Prüft ausschließlich die Backend-Akzeptanzkriterien aus
/// <c>docs/usecases/US-030-assessment-sichtbarkeit-user.md</c>, ein <see cref="FactAttribute"/> je
/// Kriterium, in derselben Reihenfolge wie im Story-Dokument, über eine echte
/// Testcontainers-PostgreSQL-Instanz. Der technische Hinweis der Story-Datei nennt als Dateipfad
/// <c>tests/SlobSteak.Api.Tests/Assessments/AssessmentController_UserRoleTests.cs</c> — die Datei
/// liegt hier bewusst stattdessen unter <c>UserStories/US030_AssessmentSichtbarkeitUserTests.cs</c>,
/// da CLAUDE.md Kernregel 3 diesen Pfad/dieses Namensschema für den dedizierten Story-Test
/// verbindlich vorschreibt (durchgängig befolgt seit US-020, präzedenzhaft zuletzt bei US-028).
/// </summary>
/// <remarks>
/// Akzeptanzkriterium 3 (Angular-Komponententest für das DOM-Entfernen der Assessment-Tabs) ist
/// Frontend-Scope (siehe Story-Technik-Hinweis, Angular <c>TestBed</c>) und liegt daher nicht in
/// diesem Backend-Story-Test. Akzeptanzkriterium 4 (Map-Navigation/Map-Query-Endpoint) kann derzeit
/// nicht getestet werden, da US-031/US-032 laut <c>docs/usecases/BACKLOG.md</c> noch nicht
/// umgesetzt sind — siehe „Anmerkungen des Agenten" in der Story-Datei.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class US030_AssessmentSichtbarkeitUserTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us030-story-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public US030_AssessmentSichtbarkeitUserTests(PostgresContainerFixture postgres)
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

    // AC 1: GET /api/v1/stakeholders/{id}/assessments liefert für Nutzer mit
    // project_membership.role = User 403 Forbidden, nicht etwa eine leere oder maskierte Liste.
    [Fact]
    public async Task AC1_Get_UserRole_ReturnsForbidden_NotEmptyOrMaskedList()
    {
        var (stakeholderId, userRoleUserId, plUserId) = await CreateStakeholderWithMembersAsync();

        using var userClient = AuthenticatedClient(userRoleUserId);
        var userResponse = await userClient.GetAsync($"/api/v1/stakeholders/{stakeholderId}/assessments");
        userResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        // Regressionsschutz: eine perspektiv-tragende Rolle erhält weiterhin 200 mit Daten — die
        // 403-Regel greift ausschließlich für Rolle User, nicht generell.
        using var plClient = AuthenticatedClient(plUserId);
        var plResponse = await plClient.GetAsync($"/api/v1/stakeholders/{stakeholderId}/assessments");
        plResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // AC 2: Integrationstest ruft den Endpoint direkt (unter Umgehung der UI) mit einem
    // User-Rolle-Token auf und verifiziert 403 sowie das Fehlen jeglicher Assessment-Felder im
    // Response-Body.
    [Fact]
    public async Task AC2_Get_UserRole_ResponseBodyContainsNoAssessmentFields()
    {
        var (stakeholderId, userRoleUserId, plUserId) = await CreateStakeholderWithMembersAsync();

        // Ein Assessment existiert bereits, damit ein potenzielles Leck (maskiert oder nicht)
        // tatsächlich Daten enthalten würde, wäre die Sichtbarkeitsregel nicht serverseitig
        // durchgesetzt.
        using var plClient = AuthenticatedClient(plUserId);
        await plClient.PutAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/assessments/PL",
            new { influence = 40, interest = 60, notes = "Vertrauliche Einschätzung" });

        using var userClient = AuthenticatedClient(userRoleUserId);
        var response = await userClient.GetAsync($"/api/v1/stakeholders/{stakeholderId}/assessments");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var raw = await response.Content.ReadAsStringAsync();
        raw.Should().NotContain("influence");
        raw.Should().NotContain("interest");
        raw.Should().NotContain("Vertrauliche Einschätzung");
        raw.Should().NotContain("updatedByName");
        raw.Should().NotContain("version");

        var body = JsonSerializer.Deserialize<JsonElement>(raw);
        body.TryGetProperty("error", out var error).Should().BeTrue();
        error.GetString().Should().Be("FORBIDDEN");
    }

    /// <summary>Erstellt ein Projekt mit User- und PL-Mitgliedschaft sowie einen Stakeholder darin.</summary>
    private async Task<(Guid StakeholderId, Guid UserRoleUserId, Guid PlUserId)> CreateStakeholderWithMembersAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var userRoleUser = User.Create("User-Rolle Nutzer", $"us030-user-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        userRoleUser.ChangePassword("correct-horse-battery-2");
        var plUser = User.Create("PL Nutzer", $"us030-pl-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        plUser.ChangePassword("correct-horse-battery-2");
        dbContext.Users.AddRange(userRoleUser, plUser);

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        project.AssignMember(userRoleUser.Id, ProjectRole.User);
        project.AssignMember(plUser.Id, ProjectRole.PL);
        dbContext.Projects.Add(project);

        var stakeholder = Stakeholder.Create(project.Id, StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, plUser.Id);
        dbContext.Stakeholders.Add(stakeholder);

        await dbContext.SaveChangesAsync();

        return (stakeholder.Id, userRoleUser.Id, plUser.Id);
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
