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
/// Dedizierter Story-Test für US-035 (Drag &amp; Drop Update-API mit Konfliktregel). Prüft
/// ausschließlich die in <c>docs/usecases/US-035-map-dragdrop-api.md</c> gelisteten
/// Akzeptanzkriterien, ein <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie
/// im Story-Dokument, über eine echte Testcontainers-PostgreSQL-Instanz — Konvention aus
/// <c>.claude/agents/qa.md</c> Abschnitt 1, analog zu <c>US028_AssessmentApiTests</c>.
///
/// Diese Story führt bewusst keinen neuen Endpoint ein (Akzeptanzkriterium 1): Drag &amp; Drop
/// verwendet exakt <c>PUT /api/v1/stakeholders/{id}/assessments/{role}</c> aus US-028. Die
/// Akzeptanzkriterien 2-4 sind damit bereits durch die in US-028 implementierte Schreiblogik
/// (<see cref="SlobSteak.Application.Assessments.UpsertStakeholderAssessmentService"/>,
/// <see cref="SlobSteak.Api.Controllers.AssessmentController.UpsertAssessment"/>) erfüllt; dieser
/// Test belegt das explizit aus Sicht des Drag&amp;Drop-Anwendungsfalls (Positions-Update ohne
/// Notiztext, zwei Nutzer derselben Rolle). Ergänzend dazu deckt
/// <c>Assessments/AssessmentController_DragDropConflictTests.cs</c> (Story-Technik-Hinweis) das im
/// Story-Dokument explizit beschriebene Zwei-Nutzer-Szenario (Akzeptanzkriterium 4) mit
/// zusätzlichen Detailprüfungen ab.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US035_MapDragDropApiTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us035-story-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public US035_MapDragDropApiTests(PostgresContainerFixture postgres)
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

    // AC 1: Drag & Drop im Frontend ruft denselben Endpoint PUT
    // /api/v1/stakeholders/{id}/assessments/{role} aus US-028 auf — kein separater
    // Map-spezifischer Schreib-Endpoint, um Schreiblogik nicht zu duplizieren. Belegt durch: ein
    // reines Positions-Update (nur influence/interest, wie beim Loslassen eines Punkts auf der
    // Map, ohne notes) über exakt diesen Endpoint gelingt und wird korrekt persistiert.
    [Fact]
    public async Task AC1_DragDropPositionUpdate_UsesSameAssessmentEndpoint_AsFormBasedUpdate()
    {
        var (stakeholderId, plUserId, _, _) = await CreateStakeholderWithTwoSameRoleMembersAsync();
        using var client = AuthenticatedClient(plUserId);

        // Erstanlage (z. B. über das Formular aus US-028)
        var createResponse = await client.PutAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/assessments/PL", new { influence = 20, interest = 30 });
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        // Drag & Drop: nur die Position (influence/interest) ändert sich, keine Notiz —
        // derselbe Endpoint, dieselbe Route.
        var dragDropResponse = await client.PutAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/assessments/PL",
            new { influence = 65, interest = 45, expectedVersion = 1 });

        dragDropResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await dragDropResponse.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("influence").GetInt32().Should().Be(65);
        body.GetProperty("interest").GetInt32().Should().Be(45);
        body.GetProperty("version").GetInt32().Should().Be(2);
    }

    // AC 2: Ein Request für eine Rolle, die nicht der eigenen Projekt-Rolle des Nutzers
    // entspricht, liefert 403 Forbidden (identische Regel wie US-028).
    [Fact]
    public async Task AC2_DragDropSave_ForForeignRole_ReturnsForbidden()
    {
        var (stakeholderId, plUserId, _, _) = await CreateStakeholderWithTwoSameRoleMembersAsync();
        using var client = AuthenticatedClient(plUserId);

        var response = await client.PutAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/assessments/Coreteam", new { influence = 10, interest = 10 });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // AC 3: Ein Request mit veralteter expectedVersion (Assessment wurde zwischen Laden der Map
    // und Loslassen von anderem Nutzer derselben Rolle geändert) liefert 409 Conflict mit
    // denselben Feldern wie in US-028 ({"error":"ASSESSMENT_MODIFIED","modifiedBy":...,
    // "modifiedAt":...}).
    [Fact]
    public async Task AC3_DragDropSave_WithStaleExpectedVersion_ReturnsConflict_WithSameFieldsAsUS028()
    {
        var (stakeholderId, plUserId1, plUserId2, _) = await CreateStakeholderWithTwoSameRoleMembersAsync();
        using var client1 = AuthenticatedClient(plUserId1);
        using var client2 = AuthenticatedClient(plUserId2);

        await client1.PutAsJsonAsync($"/api/v1/stakeholders/{stakeholderId}/assessments/PL", new { influence = 20, interest = 30 });

        // Zweiter Nutzer derselben Rolle ändert die Position zwischenzeitlich (Version 1 -> 2).
        await client2.PutAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/assessments/PL",
            new { influence = 55, interest = 55, expectedVersion = 1 });

        // Erster Nutzer speichert seinen Drag-Drop-Vorgang noch mit der Version, die er beim
        // Laden der Map gesehen hat (Version 1) -> Konflikt.
        var conflictResponse = await client1.PutAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/assessments/PL",
            new { influence = 80, interest = 20, expectedVersion = 1 });

        conflictResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await conflictResponse.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("error").GetString().Should().Be("ASSESSMENT_MODIFIED");
        body.GetProperty("modifiedBy").GetString().Should().NotBeNullOrEmpty();
        body.GetProperty("modifiedAt").GetDateTimeOffset().Should().NotBe(default);
    }

    // AC 4: Integrationstest simuliert: Map laden (Version X) -> paralleles Update durch zweiten
    // Nutzer derselben Rolle (Version X+1) -> Drag-Drop-Save mit expectedVersion = X -> 409.
    [Fact]
    public async Task AC4_MapLoadedAtVersionX_ConcurrentUpdateBySameRoleToVersionXPlus1_DragDropSaveAtX_ReturnsConflict()
    {
        var (stakeholderId, plUserId1, plUserId2, _) = await CreateStakeholderWithTwoSameRoleMembersAsync();
        using var client1 = AuthenticatedClient(plUserId1);
        using var client2 = AuthenticatedClient(plUserId2);

        // Vorbedingung: Assessment existiert bereits mit Version X (=1).
        await client1.PutAsJsonAsync($"/api/v1/stakeholders/{stakeholderId}/assessments/PL", new { influence = 30, interest = 40 });

        // "Map laden": zweiter Nutzer derselben Rolle sieht ebenfalls Version X = 1.
        var mapLoadResponse = await client2.GetAsync($"/api/v1/stakeholders/{stakeholderId}/assessments");
        var mapLoadBody = await mapLoadResponse.Content.ReadFromJsonAsync<JsonElement>();
        var loadedVersion = mapLoadBody.EnumerateArray()
            .Single(e => e.GetProperty("role").GetString() == "PL")
            .GetProperty("version").GetInt32();
        loadedVersion.Should().Be(1);

        // Paralleles Update durch den zweiten Nutzer derselben Rolle -> Version X+1 = 2.
        var concurrentUpdateResponse = await client2.PutAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/assessments/PL",
            new { influence = 60, interest = 70, expectedVersion = loadedVersion });
        concurrentUpdateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Drag-Drop-Save des ersten Nutzers mit der beim Laden gesehenen expectedVersion = X (=1).
        var dragDropSaveResponse = await client1.PutAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/assessments/PL",
            new { influence = 10, interest = 90, expectedVersion = loadedVersion });

        dragDropSaveResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    /// <summary>Erstellt ein Projekt mit zwei Nutzern, die beide der Rolle <see cref="ProjectRole.PL"/>
    /// zugeordnet sind (mehrere Mitglieder je Rolle sind laut <see cref="Project.AssignMember"/>
    /// erlaubt — nur die Nutzer-Id muss je Projekt eindeutig sein), sowie einen Stakeholder darin.</summary>
    private async Task<(Guid StakeholderId, Guid PlUserId1, Guid PlUserId2, Guid CoreteamUserId)> CreateStakeholderWithTwoSameRoleMembersAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var plUser1 = User.Create("PL Nutzer 1", $"us035-pl1-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        plUser1.ChangePassword("correct-horse-battery-2");
        var plUser2 = User.Create("PL Nutzer 2", $"us035-pl2-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        plUser2.ChangePassword("correct-horse-battery-2");
        var coreteamUser = User.Create("Coreteam Nutzer", $"us035-coreteam-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        coreteamUser.ChangePassword("correct-horse-battery-2");
        dbContext.Users.AddRange(plUser1, plUser2, coreteamUser);

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        project.AssignMember(plUser1.Id, ProjectRole.PL);
        project.AssignMember(plUser2.Id, ProjectRole.PL);
        project.AssignMember(coreteamUser.Id, ProjectRole.Coreteam);
        dbContext.Projects.Add(project);

        var stakeholder = Stakeholder.Create(project.Id, StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, plUser1.Id);
        dbContext.Stakeholders.Add(stakeholder);

        await dbContext.SaveChangesAsync();

        return (stakeholder.Id, plUser1.Id, plUser2.Id, coreteamUser.Id);
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
