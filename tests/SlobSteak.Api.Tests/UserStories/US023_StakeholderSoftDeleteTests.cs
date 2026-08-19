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
using SlobSteak.Domain.Communications;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.ValueObjects;
using SlobSteak.Domain.Stakeholders;
using SlobSteak.Infrastructure.Persistence;

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-023 (Stakeholder Soft-Delete: API + UI). Prüft die in
/// <c>docs/usecases/US-023-stakeholder-soft-delete.md</c> gelisteten Akzeptanzkriterien, ein
/// <see cref="FactAttribute"/>/<see cref="TheoryAttribute"/> je Kriterium, in derselben
/// Reihenfolge wie im Story-Dokument, über eine echte Testcontainers-PostgreSQL-Instanz.
/// Akzeptanzkriterium 4 prüft ausschließlich die Standard-Stakeholderliste
/// (<c>GET /api/v1/projects/{projectId}/stakeholders</c>) — Map-Query (US-031) und
/// Verteilerlisten-Filter (US-041) existieren als eigenständige Abfragen noch nicht (weit spätere
/// Phasen) und werden dort erneut geprüft, sobald sie entstehen (siehe „Anmerkungen des
/// Dev-Agenten“ in der Story-Datei). Akzeptanzkriterium 6 (UI-Bestätigungsdialog) siehe
/// <c>delete-stakeholder-dialog.component.spec.ts</c>.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US023_StakeholderSoftDeleteTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us023-story-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public US023_StakeholderSoftDeleteTests(PostgresContainerFixture postgres)
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

    // AC 1: DELETE /api/v1/stakeholders/{id} ist ausschließlich für Rolle PL erreichbar; sonst
    // 403 Forbidden.
    [Fact]
    public async Task AC1_PLRole_CanDeleteStakeholder()
    {
        var (stakeholderId, userId) = await CreateStakeholderWithMemberAsync(ProjectRole.PL);
        using var client = AuthenticatedClient(userId);

        var response = await client.DeleteAsync($"/api/v1/stakeholders/{stakeholderId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Theory]
    [InlineData(ProjectRole.Coreteam)]
    [InlineData(ProjectRole.Architect)]
    [InlineData(ProjectRole.User)]
    public async Task AC1_NonPLRoles_Return403Forbidden(ProjectRole role)
    {
        var (stakeholderId, userId) = await CreateStakeholderWithMemberAsync(role);
        using var client = AuthenticatedClient(userId);

        var response = await client.DeleteAsync($"/api/v1/stakeholders/{stakeholderId}");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // AC 2: GET /api/v1/stakeholders/{id}/deletion-impact liefert die Anzahl betroffener
    // Assessments und Kommunikationszuordnungen.
    [Fact]
    public async Task AC2_DeletionImpact_ReturnsAssessmentAndCommunicationAssignmentCounts()
    {
        var (stakeholderId, userId) = await CreateStakeholderWithMemberAsync(ProjectRole.PL);
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            dbContext.StakeholderAssessments.Add(new StakeholderAssessment(
                Guid.NewGuid(), stakeholderId, ProjectRole.PL, new Score(30), new Score(70), null, userId, DateTimeOffset.UtcNow));

            var communicationType = new CommunicationType(Guid.NewGuid(), $"Typ-{Guid.NewGuid():N}", isActive: true, DateTimeOffset.UtcNow);
            dbContext.CommunicationTypes.Add(communicationType);
            await dbContext.SaveChangesAsync();

            dbContext.StakeholderCommunicationAssignments.Add(new StakeholderCommunicationAssignment(
                Guid.NewGuid(), stakeholderId, communicationType.Id, CommunicationFrequency.Weekly, CommunicationChannel.Email));
            await dbContext.SaveChangesAsync();
        }

        using var client = AuthenticatedClient(userId);
        var response = await client.GetAsync($"/api/v1/stakeholders/{stakeholderId}/deletion-impact");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("assessmentCount").GetInt32().Should().Be(1);
        body.GetProperty("communicationAssignmentCount").GetInt32().Should().Be(1);
    }

    // AC 3: DELETE setzt ausschließlich deleted_at/deleted_by; der Datensatz sowie zugehörige
    // stakeholder_assessments-/stakeholder_communication_assignments-Zeilen bleiben physisch
    // unverändert bestehen.
    [Fact]
    public async Task AC3_Delete_OnlySetsDeletedFields_LeavesRelatedRowsPhysicallyIntact()
    {
        var (stakeholderId, userId) = await CreateStakeholderWithMemberAsync(ProjectRole.PL);
        Guid assessmentId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var assessment = new StakeholderAssessment(
                Guid.NewGuid(), stakeholderId, ProjectRole.PL, new Score(30), new Score(70), null, userId, DateTimeOffset.UtcNow);
            dbContext.StakeholderAssessments.Add(assessment);
            await dbContext.SaveChangesAsync();
            assessmentId = assessment.Id;
        }

        using var client = AuthenticatedClient(userId);
        var response = await client.DeleteAsync($"/api/v1/stakeholders/{stakeholderId}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        using var verifyScope = _factory.Services.CreateScope();
        var verifyDbContext = verifyScope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        var stakeholder = await verifyDbContext.Stakeholders.SingleAsync(s => s.Id == stakeholderId);
        stakeholder.DeletedAt.Should().NotBeNull();
        stakeholder.DeletedBy.Should().Be(userId);
        stakeholder.Name.Should().Be("Ursprünglicher Name");

        (await verifyDbContext.StakeholderAssessments.AnyAsync(a => a.Id == assessmentId)).Should().BeTrue();
    }

    // AC 4: Nach dem Löschen liefert GET /api/v1/projects/{projectId}/stakeholders (Standardliste)
    // diesen Stakeholder nicht mehr.
    [Fact]
    public async Task AC4_AfterDelete_StandardListNoLongerReturnsStakeholder()
    {
        var (stakeholderId, userId, projectId) = await CreateStakeholderWithMemberAndProjectAsync(ProjectRole.PL);
        using var client = AuthenticatedClient(userId);
        await client.DeleteAsync($"/api/v1/stakeholders/{stakeholderId}");

        var response = await client.GetAsync($"/api/v1/projects/{projectId}/stakeholders");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.EnumerateArray().Should().NotContain(s => s.GetProperty("id").GetGuid() == stakeholderId);
    }

    // AC 5: Erneutes DELETE auf einen bereits gelöschten Stakeholder liefert 200 OK/idempotent
    // ohne Fehler; deleted_at bleibt beim ursprünglichen Zeitpunkt.
    [Fact]
    public async Task AC5_RepeatedDelete_IsIdempotent_DeletedAtUnchanged()
    {
        var (stakeholderId, userId) = await CreateStakeholderWithMemberAsync(ProjectRole.PL);
        using var client = AuthenticatedClient(userId);
        await client.DeleteAsync($"/api/v1/stakeholders/{stakeholderId}");

        DateTimeOffset? firstDeletedAt;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            firstDeletedAt = (await dbContext.Stakeholders.SingleAsync(s => s.Id == stakeholderId)).DeletedAt;
        }

        var secondResponse = await client.DeleteAsync($"/api/v1/stakeholders/{stakeholderId}");

        secondResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        using var verifyScope = _factory.Services.CreateScope();
        var verifyDbContext = verifyScope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        (await verifyDbContext.Stakeholders.SingleAsync(s => s.Id == stakeholderId)).DeletedAt.Should().Be(firstDeletedAt);
    }

    private async Task<(Guid StakeholderId, Guid UserId)> CreateStakeholderWithMemberAsync(ProjectRole role)
    {
        var (stakeholderId, userId, _) = await CreateStakeholderWithMemberAndProjectAsync(role);
        return (stakeholderId, userId);
    }

    private async Task<(Guid StakeholderId, Guid UserId, Guid ProjectId)> CreateStakeholderWithMemberAndProjectAsync(ProjectRole role)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var user = User.Create("Zielnutzer", $"us023-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        user.ChangePassword("correct-horse-battery-2");
        dbContext.Users.Add(user);

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        project.AssignMember(user.Id, role);
        dbContext.Projects.Add(project);

        await dbContext.SaveChangesAsync();

        var stakeholder = Stakeholder.Create(
            project.Id, StakeholderType.Person, "Ursprünglicher Name", null, null, null, null, null, null, user.Id);
        dbContext.Stakeholders.Add(stakeholder);
        await dbContext.SaveChangesAsync();

        return (stakeholder.Id, user.Id, project.Id);
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
