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

namespace SlobSteak.Api.Tests.Assessments;

/// <summary>
/// Ergänzender Integrationstest zu US-035 (Drag &amp; Drop Update-API mit Konfliktregel), am im
/// Story-Dokument (technischer Hinweis) genannten Pfad. Der dedizierte, gegen die
/// Akzeptanzkriterien geprüfte Story-Test liegt gemäß CLAUDE.md Kernregel 3/<c>.claude/agents/qa.md</c>
/// Abschnitt 1 unter <c>UserStories/US035_MapDragDropApiTests.cs</c> — diese Datei vertieft
/// speziell das im Story-Dokument als Akzeptanzkriterium 4 beschriebene Zwei-Nutzer-Szenario
/// (Map laden mit Version X, paralleles Update durch einen zweiten Nutzer <em>derselben Rolle</em>
/// auf Version X+1, Drag-Drop-Save mit <c>expectedVersion = X</c> → 409) inklusive der Prüfung,
/// dass der Konflikt die Positionsänderung des Verlierers nicht überschreibt (Last-Write-Wins mit
/// vorgelagerter Konfliktwarnung, kein automatisches Merge — F2.1 Edge Case, siehe US-028).
///
/// Es wird bewusst keine neue Produktionslogik angesprochen: derselbe
/// <c>PUT /api/v1/stakeholders/{id}/assessments/{role}</c>-Endpoint aus US-028 wird verwendet
/// (Akzeptanzkriterium 1 der Story).
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class AssessmentController_DragDropConflictTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us035-dragdrop-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public AssessmentController_DragDropConflictTests(PostgresContainerFixture postgres)
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

    /// <summary>
    /// Kernszenario der Story: zwei Nutzer mit identischer Rolle (PL) haben die Map beide bei
    /// Assessment-Version X (=1) geladen. Nutzer B lässt seinen Punkt zuerst los (Version wird
    /// 2). Nutzer A lässt seinen Punkt danach los, aber noch mit der beim Laden gesehenen
    /// <c>expectedVersion = 1</c> → 409 mit denselben Feldern wie US-028, und die von Nutzer B
    /// gespeicherte Position bleibt unangetastet (kein stilles Überschreiben).
    /// </summary>
    [Fact]
    public async Task DragDropSave_SecondUserOfSameRoleAlreadyMovedThePoint_FirstUsersSaveConflicts_WithoutOverwriting()
    {
        var (stakeholderId, userA, userB, _) = await CreateStakeholderWithTwoPlMembersAsync();
        using var clientA = AuthenticatedClient(userA);
        using var clientB = AuthenticatedClient(userB);

        // Ausgangszustand: Assessment existiert mit Version X = 1.
        var initialCreate = await clientA.PutAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/assessments/PL", new { influence = 50, interest = 50 });
        initialCreate.StatusCode.Should().Be(HttpStatusCode.Created);

        // Beide Nutzer "laden die Map" bei Version X = 1 (simuliert über GET).
        var mapForA = await GetPlAssessmentAsync(clientA, stakeholderId);
        var mapForB = await GetPlAssessmentAsync(clientB, stakeholderId);
        mapForA.GetProperty("version").GetInt32().Should().Be(1);
        mapForB.GetProperty("version").GetInt32().Should().Be(1);

        // Nutzer B lässt zuerst los: Position wandert auf (70, 20), Version wird 2.
        var bSaveResponse = await clientB.PutAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/assessments/PL",
            new { influence = 70, interest = 20, expectedVersion = 1 });
        bSaveResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Nutzer A lässt danach los, noch mit expectedVersion = 1 (Stand beim Laden) -> Konflikt.
        var aSaveResponse = await clientA.PutAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/assessments/PL",
            new { influence = 5, interest = 95, expectedVersion = 1 });

        aSaveResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var conflictBody = await aSaveResponse.Content.ReadFromJsonAsync<JsonElement>();
        conflictBody.GetProperty("error").GetString().Should().Be("ASSESSMENT_MODIFIED");
        conflictBody.GetProperty("modifiedBy").GetString().Should().NotBeNullOrEmpty();
        conflictBody.GetProperty("modifiedAt").GetDateTimeOffset().Should().NotBe(default);

        // Die von B gespeicherte Position bleibt erhalten - kein stilles Überschreiben durch A.
        var finalState = await GetPlAssessmentAsync(clientA, stakeholderId);
        finalState.GetProperty("influence").GetInt32().Should().Be(70);
        finalState.GetProperty("interest").GetInt32().Should().Be(20);
        finalState.GetProperty("version").GetInt32().Should().Be(2);
    }

    /// <summary>Ohne konkurrierendes Update zwischen Laden und Speichern gelingt der
    /// Drag-Drop-Save auch dann, wenn zwei Nutzer dieselbe Rolle tragen (keine falsch-positiven
    /// Konflikte allein durch die Existenz eines zweiten Rolleninhabers).</summary>
    [Fact]
    public async Task DragDropSave_NoConcurrentChange_SucceedsEvenWithSecondUserOfSameRolePresent()
    {
        var (stakeholderId, userA, _, _) = await CreateStakeholderWithTwoPlMembersAsync();
        using var clientA = AuthenticatedClient(userA);

        await clientA.PutAsJsonAsync($"/api/v1/stakeholders/{stakeholderId}/assessments/PL", new { influence = 50, interest = 50 });

        var response = await clientA.PutAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/assessments/PL",
            new { influence = 60, interest = 40, expectedVersion = 1 });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private static async Task<JsonElement> GetPlAssessmentAsync(HttpClient client, Guid stakeholderId)
    {
        var response = await client.GetAsync($"/api/v1/stakeholders/{stakeholderId}/assessments");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.EnumerateArray().Single(e => e.GetProperty("role").GetString() == "PL");
    }

    /// <summary>Erstellt ein Projekt mit zwei Nutzern in identischer Rolle (PL) sowie einen
    /// Stakeholder darin — Grundlage für das "zweiter Nutzer derselben Rolle"-Szenario der
    /// Story.</summary>
    private async Task<(Guid StakeholderId, Guid UserA, Guid UserB, Guid CoreteamUserId)> CreateStakeholderWithTwoPlMembersAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var userA = User.Create("PL Nutzer A", $"us035-conflict-a-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        userA.ChangePassword("correct-horse-battery-2");
        var userB = User.Create("PL Nutzer B", $"us035-conflict-b-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        userB.ChangePassword("correct-horse-battery-2");
        var coreteamUser = User.Create("Coreteam Nutzer", $"us035-conflict-coreteam-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        coreteamUser.ChangePassword("correct-horse-battery-2");
        dbContext.Users.AddRange(userA, userB, coreteamUser);

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        project.AssignMember(userA.Id, ProjectRole.PL);
        project.AssignMember(userB.Id, ProjectRole.PL);
        project.AssignMember(coreteamUser.Id, ProjectRole.Coreteam);
        dbContext.Projects.Add(project);

        var stakeholder = Stakeholder.Create(project.Id, StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, userA.Id);
        dbContext.Stakeholders.Add(stakeholder);

        await dbContext.SaveChangesAsync();

        return (stakeholder.Id, userA.Id, userB.Id, coreteamUser.Id);
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
