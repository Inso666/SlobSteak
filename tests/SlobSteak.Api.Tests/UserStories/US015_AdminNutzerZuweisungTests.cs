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
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.ValueObjects;
using SlobSteak.Domain.Stakeholders;
using SlobSteak.Infrastructure.Persistence;

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-015 (Admin-API: Nutzer-Projekt-Zuweisung mit Rolle). Prüft
/// ausschließlich die in <c>docs/usecases/US-015-admin-nutzer-zuweisung.md</c> gelisteten
/// Akzeptanzkriterien, ein <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie
/// im Story-Dokument, über eine echte Testcontainers-PostgreSQL-Instanz.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US015_AdminNutzerZuweisungTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us015-story-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public US015_AdminNutzerZuweisungTests(PostgresContainerFixture postgres)
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

    // AC 1: POST /api/v1/admin/projects/{projectId}/memberships mit userId, role liefert
    // 201 Created.
    [Fact]
    public async Task AC1_ValidAssignment_Returns201()
    {
        var (projectId, userId) = await CreateProjectAndUserAsync();
        using var client = AdminClient();

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/projects/{projectId}/memberships", new { userId, role = "PL" });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    // AC 2: Zuweisung eines Nutzers, der im Projekt bereits eine Rolle hat, liefert 409 Conflict
    // mit {"error":"MEMBERSHIP_ALREADY_EXISTS"}.
    [Fact]
    public async Task AC2_UserAlreadyMember_Returns409_WithMembershipAlreadyExistsError()
    {
        var (projectId, userId) = await CreateProjectAndUserAsync();
        using var client = AdminClient();
        await client.PostAsJsonAsync($"/api/v1/admin/projects/{projectId}/memberships", new { userId, role = "PL" });

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/projects/{projectId}/memberships", new { userId, role = "Coreteam" });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("error").GetString().Should().Be("MEMBERSHIP_ALREADY_EXISTS");
    }

    // AC 3: PATCH /api/v1/admin/projects/{projectId}/memberships/{userId} mit neuer role ändert
    // die bestehende Rollenzuweisung und liefert 200 OK.
    [Fact]
    public async Task AC3_ChangeRole_Returns200_UpdatesRole()
    {
        var (projectId, userId) = await CreateProjectAndUserAsync();
        using var client = AdminClient();
        await client.PostAsJsonAsync($"/api/v1/admin/projects/{projectId}/memberships", new { userId, role = "Coreteam" });

        var response = await client.PatchAsJsonAsync(
            $"/api/v1/admin/projects/{projectId}/memberships/{userId}", new { role = "Architect" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        var membership = await dbContext.ProjectMemberships.SingleAsync(m => m.ProjectId == projectId && m.UserId == userId);
        membership.Role.Should().Be(ProjectRole.Architect);
    }

    // AC 4: DELETE /api/v1/admin/projects/{projectId}/memberships/{userId} entfernt die Zuweisung
    // und liefert 204 No Content; bereits erfasste Assessments der Rolle bleiben laut
    // Integrationstest unverändert erhalten.
    [Fact]
    public async Task AC4_RemoveMembership_Returns204_LeavesAssessmentsUntouched()
    {
        var (projectId, userId) = await CreateProjectAndUserAsync();
        using var client = AdminClient();
        await client.PostAsJsonAsync($"/api/v1/admin/projects/{projectId}/memberships", new { userId, role = "PL" });

        Guid stakeholderId;
        Guid assessmentId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var stakeholder = new Stakeholder(
                Guid.NewGuid(), projectId, StakeholderType.Person, "Max Mustermann", null, null, null, null, null,
                null, userId, DateTimeOffset.UtcNow, userId, DateTimeOffset.UtcNow, null, null);
            dbContext.Stakeholders.Add(stakeholder);
            await dbContext.SaveChangesAsync();
            stakeholderId = stakeholder.Id;

            var assessment = new StakeholderAssessment(
                Guid.NewGuid(), stakeholder.Id, ProjectRole.PL, new Score(30), new Score(70), null, userId, DateTimeOffset.UtcNow);
            dbContext.StakeholderAssessments.Add(assessment);
            await dbContext.SaveChangesAsync();
            assessmentId = assessment.Id;
        }

        var response = await client.DeleteAsync($"/api/v1/admin/projects/{projectId}/memberships/{userId}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using (var verifyScope = _factory.Services.CreateScope())
        {
            var dbContext = verifyScope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            (await dbContext.ProjectMemberships.AnyAsync(m => m.ProjectId == projectId && m.UserId == userId)).Should().BeFalse();

            var assessment = await dbContext.StakeholderAssessments.SingleAsync(a => a.Id == assessmentId);
            assessment.Influence.Should().Be(new Score(30));
            assessment.Interest.Should().Be(new Score(70));
        }
    }

    // AC 5: Alle Endpunkte sind ausschließlich für Systemadmins erreichbar.
    [Fact]
    public async Task AC5_AllEndpoints_RejectNonAdmin_With403()
    {
        var (projectId, userId) = await CreateProjectAndUserAsync();
        using var client = NonAdminClient();

        var postResponse = await client.PostAsJsonAsync($"/api/v1/admin/projects/{projectId}/memberships", new { userId, role = "PL" });
        postResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var patchResponse = await client.PatchAsJsonAsync($"/api/v1/admin/projects/{projectId}/memberships/{userId}", new { role = "PL" });
        patchResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var deleteResponse = await client.DeleteAsync($"/api/v1/admin/projects/{projectId}/memberships/{userId}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    private async Task<(Guid ProjectId, Guid UserId)> CreateProjectAndUserAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        dbContext.Projects.Add(project);

        var user = User.Create("Zielnutzer", $"us015-{Guid.NewGuid():N}@example.com", "correct-horse");
        dbContext.Users.Add(user);

        await dbContext.SaveChangesAsync();

        return (project.Id, user.Id);
    }

    private HttpClient AdminClient() => AuthenticatedClient(isSystemAdmin: true);

    private HttpClient NonAdminClient() => AuthenticatedClient(isSystemAdmin: false);

    private HttpClient AuthenticatedClient(bool isSystemAdmin)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { [JwtSettings.SigningKeyConfigurationKey] = SigningKey })
            .Build();
        var token = new JwtTokenGenerator(configuration).GenerateToken(Guid.NewGuid(), isSystemAdmin);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}
