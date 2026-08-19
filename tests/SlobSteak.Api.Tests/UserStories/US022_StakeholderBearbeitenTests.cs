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
/// Dedizierter Story-Test für US-022 (Stakeholder-Stammdaten bearbeiten: API + UI inkl.
/// Änderungsverlauf). Prüft ausschließlich die in
/// <c>docs/usecases/US-022-stakeholder-bearbeiten.md</c> gelisteten Akzeptanzkriterien, ein
/// <see cref="FactAttribute"/>/<see cref="TheoryAttribute"/> je Kriterium, in derselben
/// Reihenfolge wie im Story-Dokument, über eine echte Testcontainers-PostgreSQL-Instanz.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US022_StakeholderBearbeitenTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us022-story-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public US022_StakeholderBearbeitenTests(PostgresContainerFixture postgres)
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

    // AC 1: PATCH /api/v1/stakeholders/{id} aktualisiert beliebige Stammdatenfelder aus F1.1 und
    // liefert 200 OK mit aktualisiertem updated_by/updated_at.
    [Fact]
    public async Task AC1_ValidUpdate_Returns200_WithUpdatedFieldsAndUpdatedByUpdatedAt()
    {
        var (stakeholderId, userId) = await CreateStakeholderWithMemberAsync(ProjectRole.PL);
        using var client = AuthenticatedClient(userId);

        var response = await client.PatchAsJsonAsync($"/api/v1/stakeholders/{stakeholderId}", new
        {
            name = "Aktualisierter Name",
            type = "Person",
            organization = "Neue Organisation",
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("name").GetString().Should().Be("Aktualisierter Name");
        body.GetProperty("organization").GetString().Should().Be("Neue Organisation");
        body.TryGetProperty("updatedByName", out _).Should().BeTrue();
        body.TryGetProperty("updatedAt", out _).Should().BeTrue();
    }

    // AC 2: Endpoint ist für PL, Coreteam, Architect erreichbar, für User 403 Forbidden.
    [Theory]
    [InlineData(ProjectRole.PL)]
    [InlineData(ProjectRole.Coreteam)]
    [InlineData(ProjectRole.Architect)]
    public async Task AC2_AllowedRoles_CanUpdateStakeholder(ProjectRole role)
    {
        var (stakeholderId, userId) = await CreateStakeholderWithMemberAsync(role);
        using var client = AuthenticatedClient(userId);

        var response = await client.PatchAsJsonAsync($"/api/v1/stakeholders/{stakeholderId}", new { name = "Name", type = "Person" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task AC2_UserRole_Returns403Forbidden()
    {
        var (stakeholderId, userId) = await CreateStakeholderWithMemberAsync(ProjectRole.User);
        using var client = AuthenticatedClient(userId);

        var response = await client.PatchAsJsonAsync($"/api/v1/stakeholders/{stakeholderId}", new { name = "Name", type = "Person" });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // AC 3: Änderungen sind ohne Freigabeprozess sofort für alle Projektmitglieder sichtbar (kein
    // Draft-/Approval-Zustand im Datenmodell) — verifiziert über einen direkten DB-Read nach dem
    // PATCH (kein separater GET-Endpoint existiert für einen einzelnen Stakeholder).
    [Fact]
    public async Task AC3_UpdateIsImmediatelyPersisted_NoDraftState()
    {
        var (stakeholderId, userId) = await CreateStakeholderWithMemberAsync(ProjectRole.PL);
        using var client = AuthenticatedClient(userId);

        await client.PatchAsJsonAsync($"/api/v1/stakeholders/{stakeholderId}", new { name = "Sofort sichtbar", type = "Person" });

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        var persisted = await dbContext.Stakeholders.SingleAsync(s => s.Id == stakeholderId);
        persisted.Name.Should().Be("Sofort sichtbar");
    }

    // AC 4: Stakeholder-Detailseite zeigt „Zuletzt geändert von [Name] am [Datum/Uhrzeit]“,
    // gespeist aus updated_by/updated_at — geprüft auf API-Ebene, dass der Response-Body den
    // aufgelösten Namen (nicht nur die rohe UserId) trägt.
    [Fact]
    public async Task AC4_ResponseIncludesResolvedUpdaterName_NotJustRawUserId()
    {
        var (stakeholderId, userId) = await CreateStakeholderWithMemberAsync(ProjectRole.PL);
        using var client = AuthenticatedClient(userId);

        var response = await client.PatchAsJsonAsync($"/api/v1/stakeholders/{stakeholderId}", new { name = "Name", type = "Person" });

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("updatedByName").GetString().Should().Be("Zielnutzer");
    }

    // AC 5: PATCH auf einen soft-gelöschten Stakeholder liefert 404 Not Found.
    [Fact]
    public async Task AC5_PatchOnSoftDeletedStakeholder_Returns404()
    {
        var (stakeholderId, userId) = await CreateStakeholderWithMemberAsync(ProjectRole.PL);
        using (var scope = _factory.Services.CreateScope())
        {
            var stakeholderRepository = scope.ServiceProvider.GetRequiredService<IStakeholderRepository>();
            var stakeholder = await stakeholderRepository.FindByIdAsync(stakeholderId);
            stakeholder!.SoftDelete(userId);
            await stakeholderRepository.SaveAsync(stakeholder);
        }

        using var client = AuthenticatedClient(userId);
        var response = await client.PatchAsJsonAsync($"/api/v1/stakeholders/{stakeholderId}", new { name = "Name", type = "Person" });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    private async Task<(Guid StakeholderId, Guid UserId)> CreateStakeholderWithMemberAsync(ProjectRole role)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var user = User.Create("Zielnutzer", $"us022-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
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

        return (stakeholder.Id, user.Id);
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
