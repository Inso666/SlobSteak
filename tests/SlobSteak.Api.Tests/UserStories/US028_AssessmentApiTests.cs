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
/// Dedizierter Story-Test für US-028 (Assessment erstellen/aktualisieren API inkl.
/// Optimistic-Locking-Konfliktregel). Prüft ausschließlich die in
/// <c>docs/usecases/US-028-assessment-api.md</c> gelisteten Akzeptanzkriterien, ein
/// <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie im Story-Dokument, über
/// eine echte Testcontainers-PostgreSQL-Instanz. Der technische Hinweis der Story-Datei nennt als
/// Dateipfad <c>tests/SlobSteak.Api.Tests/Assessments/AssessmentControllerTests.cs</c> — die Datei
/// liegt hier bewusst stattdessen unter <c>UserStories/US028_AssessmentApiTests.cs</c>, da
/// CLAUDE.md Kernregel 3 diesen Pfad/dieses Namensschema für den dedizierten Story-Test
/// verbindlich vorschreibt (durchgängig befolgt seit US-020).
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US028_AssessmentApiTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us028-story-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public US028_AssessmentApiTests(PostgresContainerFixture postgres)
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

    // AC 1: PUT .../assessments/{role} legt ein Assessment an, falls keins existiert, oder
    // aktualisiert das bestehende; Response 200/201 enthält influence, interest, notes,
    // updatedBy, updatedAt, version.
    [Fact]
    public async Task AC1_Put_CreatesOnFirstCall_UpdatesOnSecondCall_ResponseContainsAllFields()
    {
        var (stakeholderId, plUserId, _) = await CreateStakeholderWithMembersAsync();
        using var client = AuthenticatedClient(plUserId);

        var createResponse = await client.PutAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/assessments/PL", new { influence = 40, interest = 60, notes = "Erste Einschätzung" });
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var createBody = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        createBody.GetProperty("influence").GetInt32().Should().Be(40);
        createBody.GetProperty("interest").GetInt32().Should().Be(60);
        createBody.GetProperty("notes").GetString().Should().Be("Erste Einschätzung");
        createBody.GetProperty("updatedByName").GetString().Should().NotBeNullOrEmpty();
        createBody.GetProperty("updatedAt").GetDateTimeOffset().Should().NotBe(default);
        createBody.GetProperty("version").GetInt32().Should().Be(1);

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/assessments/PL",
            new { influence = 70, interest = 80, notes = "Aktualisiert", expectedVersion = 1 });
        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updateBody = await updateResponse.Content.ReadFromJsonAsync<JsonElement>();
        updateBody.GetProperty("influence").GetInt32().Should().Be(70);
        updateBody.GetProperty("version").GetInt32().Should().Be(2);
    }

    // AC 2: Ein Nutzer mit project_membership.role = X darf ausschließlich
    // PUT .../assessments/X für sein eigenes Rollensegment aufrufen; PUT .../assessments/Y
    // (fremde Rolle) liefert 403 Forbidden.
    [Fact]
    public async Task AC2_Put_ForeignRole_ReturnsForbidden_OwnRoleSucceeds()
    {
        var (stakeholderId, plUserId, coreteamUserId) = await CreateStakeholderWithMembersAsync();

        using var plClient = AuthenticatedClient(plUserId);
        var foreignRoleResponse = await plClient.PutAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/assessments/Coreteam", new { influence = 50, interest = 50 });
        foreignRoleResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        using var coreteamClient = AuthenticatedClient(coreteamUserId);
        var ownRoleResponse = await coreteamClient.PutAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/assessments/Coreteam", new { influence = 50, interest = 50 });
        ownRoleResponse.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    // AC 3: Request enthält optional expectedVersion; weicht dieser vom aktuell persistierten Wert
    // ab, liefert die API 409 Conflict mit {"error":"ASSESSMENT_MODIFIED", "modifiedBy":"...",
    // "modifiedAt":"..."} statt zu überschreiben.
    [Fact]
    public async Task AC3_Put_StaleExpectedVersion_ReturnsConflict_WithModificationDetails_WithoutOverwriting()
    {
        var (stakeholderId, plUserId, _) = await CreateStakeholderWithMembersAsync();
        using var client = AuthenticatedClient(plUserId);
        await client.PutAsJsonAsync($"/api/v1/stakeholders/{stakeholderId}/assessments/PL", new { influence = 40, interest = 60 });

        var conflictResponse = await client.PutAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/assessments/PL",
            new { influence = 99, interest = 99, expectedVersion = 42 });

        conflictResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await conflictResponse.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("error").GetString().Should().Be("ASSESSMENT_MODIFIED");
        body.GetProperty("modifiedBy").GetString().Should().NotBeNullOrEmpty();
        body.GetProperty("modifiedAt").GetDateTimeOffset().Should().NotBe(default);

        var getResponse = await client.GetAsync($"/api/v1/stakeholders/{stakeholderId}/assessments");
        var getBody = await getResponse.Content.ReadFromJsonAsync<JsonElement>();
        var plEntry = getBody.EnumerateArray().Single(e => e.GetProperty("role").GetString() == "PL");
        plEntry.GetProperty("influence").GetInt32().Should().Be(40); // unverändert, kein Überschreiben
    }

    // AC 4: Fehlt expectedVersion im Request (z. B. beim erstmaligen Anlegen), wird ohne
    // Konfliktprüfung gespeichert.
    [Fact]
    public async Task AC4_Put_MissingExpectedVersion_SavesWithoutConflictCheck_EvenIfVersionAdvanced()
    {
        var (stakeholderId, plUserId, _) = await CreateStakeholderWithMembersAsync();
        using var client = AuthenticatedClient(plUserId);
        await client.PutAsJsonAsync($"/api/v1/stakeholders/{stakeholderId}/assessments/PL", new { influence = 40, interest = 60 });
        await client.PutAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/assessments/PL", new { influence = 50, interest = 50, expectedVersion = 1 }); // Version jetzt 2

        var response = await client.PutAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/assessments/PL", new { influence = 77, interest = 88 }); // kein expectedVersion

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("influence").GetInt32().Should().Be(77);
        body.GetProperty("version").GetInt32().Should().Be(3);
    }

    // AC 5: GET .../assessments liefert alle vorhandenen Assessments (max. 3) des Stakeholders
    // inkl. updatedBy/updatedAt/version je Rolle, sowie für nicht vorhandene Rollen einen
    // expliziten status: "NOT_ASSESSED".
    [Fact]
    public async Task AC5_Get_ReturnsAllRoles_AssessedIncludesFields_MissingRolesAreNotAssessed()
    {
        var (stakeholderId, plUserId, _) = await CreateStakeholderWithMembersAsync();
        using var client = AuthenticatedClient(plUserId);
        await client.PutAsJsonAsync($"/api/v1/stakeholders/{stakeholderId}/assessments/PL", new { influence = 40, interest = 60, notes = "Notiz" });

        var response = await client.GetAsync($"/api/v1/stakeholders/{stakeholderId}/assessments");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var entries = body.EnumerateArray().ToList();
        entries.Should().HaveCount(3);

        var plEntry = entries.Single(e => e.GetProperty("role").GetString() == "PL");
        plEntry.GetProperty("status").GetString().Should().Be("ASSESSED");
        plEntry.GetProperty("influence").GetInt32().Should().Be(40);
        plEntry.GetProperty("updatedByName").GetString().Should().NotBeNullOrEmpty();
        plEntry.GetProperty("version").GetInt32().Should().Be(1);

        var coreteamEntry = entries.Single(e => e.GetProperty("role").GetString() == "Coreteam");
        coreteamEntry.GetProperty("status").GetString().Should().Be("NOT_ASSESSED");
    }

    // AC 6: Ist einem Projekt aktuell kein Nutzer mit der angefragten Rolle zugewiesen, liefert
    // GET für diese Rolle status: "NO_ROLE_ASSIGNED" statt "NOT_ASSESSED".
    [Fact]
    public async Task AC6_Get_RoleWithoutAnyAssignedMember_ReturnsNoRoleAssigned()
    {
        // Architect wird bewusst nicht zugewiesen (siehe CreateStakeholderWithMembersAsync).
        var (stakeholderId, plUserId, _) = await CreateStakeholderWithMembersAsync();
        using var client = AuthenticatedClient(plUserId);

        var response = await client.GetAsync($"/api/v1/stakeholders/{stakeholderId}/assessments");

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var architectEntry = body.EnumerateArray().Single(e => e.GetProperty("role").GetString() == "Architect");
        architectEntry.GetProperty("status").GetString().Should().Be("NO_ROLE_ASSIGNED");
    }

    // AC 7: Integrationstest deckt: Erstanlage, Update durch berechtigte Rolle, Update-Versuch
    // fremder Rolle (403), veraltete Version (409).
    [Fact]
    public async Task AC7_EndToEnd_CreateUpdateByOwnRole_ForeignRoleForbidden_StaleVersionConflict()
    {
        var (stakeholderId, plUserId, coreteamUserId) = await CreateStakeholderWithMembersAsync();
        using var plClient = AuthenticatedClient(plUserId);
        using var coreteamClient = AuthenticatedClient(coreteamUserId);

        // Erstanlage
        var createResponse = await plClient.PutAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/assessments/PL", new { influence = 20, interest = 30 });
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        // Update durch berechtigte Rolle
        var updateResponse = await plClient.PutAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/assessments/PL", new { influence = 25, interest = 35, expectedVersion = 1 });
        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Update-Versuch fremder Rolle
        var foreignRoleResponse = await coreteamClient.PutAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/assessments/PL", new { influence = 99, interest = 99, expectedVersion = 2 });
        foreignRoleResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        // Veraltete Version
        var staleResponse = await plClient.PutAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/assessments/PL", new { influence = 40, interest = 40, expectedVersion = 1 });
        staleResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    /// <summary>Erstellt ein Projekt mit PL- und Coreteam-Mitgliedschaft (Architect bleibt
    /// bewusst unbesetzt, siehe AC6) sowie einen Stakeholder darin.</summary>
    private async Task<(Guid StakeholderId, Guid PlUserId, Guid CoreteamUserId)> CreateStakeholderWithMembersAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var plUser = User.Create("PL Nutzer", $"us028-pl-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        plUser.ChangePassword("correct-horse-battery-2");
        var coreteamUser = User.Create("Coreteam Nutzer", $"us028-coreteam-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        coreteamUser.ChangePassword("correct-horse-battery-2");
        dbContext.Users.AddRange(plUser, coreteamUser);

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        project.AssignMember(plUser.Id, ProjectRole.PL);
        project.AssignMember(coreteamUser.Id, ProjectRole.Coreteam);
        dbContext.Projects.Add(project);

        var stakeholder = Stakeholder.Create(project.Id, StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, plUser.Id);
        dbContext.Stakeholders.Add(stakeholder);

        await dbContext.SaveChangesAsync();

        return (stakeholder.Id, plUser.Id, coreteamUser.Id);
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
