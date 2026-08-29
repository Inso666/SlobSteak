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
using SlobSteak.Domain.Communications;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;
using SlobSteak.Infrastructure.Persistence;

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-040 (Kommunikationszuordnung API + UI auf
/// Stakeholder-Detailseite) — Backend-Anteil. Prüft ausschließlich die in
/// <c>docs/usecases/US-040-communication-assignment-ui.md</c> gelisteten Akzeptanzkriterien mit
/// Backend-Bezug (Akzeptanzkriterien 1–4), ein <see cref="FactAttribute"/> je Kriterium, in
/// derselben Reihenfolge wie im Story-Dokument, über eine echte Testcontainers-PostgreSQL-Instanz.
/// Akzeptanzkriterium 5 (Frontend, Stakeholder-Detailseite) ist im Frontend-Pendant
/// <c>frontend/src/app/features/stakeholders/us-040-communication-assignment-ui.spec.ts</c>
/// abgedeckt (QA-Konvention, <c>.claude/agents/qa.md</c> Abschnitt 1).
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US040_CommunicationAssignmentUiTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us040-story-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public US040_CommunicationAssignmentUiTests(PostgresContainerFixture postgres)
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

    // AC 1: POST /api/v1/stakeholders/{id}/communications mit communicationTypeId, frequency,
    // channel liefert 201 Created; Duplikat liefert 409 Conflict.
    [Fact]
    public async Task AC1_Post_CreatesAssignment_ReturnsCreated_DuplicateReturnsConflict()
    {
        var (stakeholderId, plUserId, _, _, _, communicationTypeId) = await CreateStakeholderWithAllRolesAsync();
        using var client = AuthenticatedClient(plUserId);

        var created = await client.PostAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/communications", new { communicationTypeId, frequency = "Weekly", channel = "Email" });

        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await created.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("communicationTypeId").GetGuid().Should().Be(communicationTypeId);
        body.GetProperty("frequency").GetString().Should().Be("Weekly");
        body.GetProperty("channel").GetString().Should().Be("Email");

        var duplicate = await client.PostAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/communications", new { communicationTypeId, frequency = "Monthly", channel = "Meeting" });

        duplicate.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var duplicateBody = await duplicate.Content.ReadFromJsonAsync<JsonElement>();
        duplicateBody.GetProperty("error").GetString().Should().Be("ASSIGNMENT_ALREADY_EXISTS");
    }

    // AC 2: PATCH .../communications/{communicationTypeId} aktualisiert Frequenz/Kanal.
    [Fact]
    public async Task AC2_Patch_UpdatesFrequencyAndChannel()
    {
        var (stakeholderId, plUserId, _, _, _, communicationTypeId) = await CreateStakeholderWithAllRolesAsync();
        using var client = AuthenticatedClient(plUserId);
        await client.PostAsJsonAsync($"/api/v1/stakeholders/{stakeholderId}/communications", new { communicationTypeId, frequency = "Weekly", channel = "Email" });

        var response = await client.PatchAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/communications/{communicationTypeId}", new { frequency = "Quarterly", channel = "Report" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("frequency").GetString().Should().Be("Quarterly");
        body.GetProperty("channel").GetString().Should().Be("Report");

        var listResponse = await client.GetAsync($"/api/v1/stakeholders/{stakeholderId}/communications");
        var listBody = await listResponse.Content.ReadFromJsonAsync<JsonElement>();
        var entry = listBody.EnumerateArray().Single();
        entry.GetProperty("frequency").GetString().Should().Be("Quarterly");
        entry.GetProperty("channel").GetString().Should().Be("Report");
    }

    // AC 3: DELETE .../communications/{communicationTypeId} entfernt die Zuordnung.
    [Fact]
    public async Task AC3_Delete_RemovesAssignment()
    {
        var (stakeholderId, plUserId, _, _, _, communicationTypeId) = await CreateStakeholderWithAllRolesAsync();
        using var client = AuthenticatedClient(plUserId);
        await client.PostAsJsonAsync($"/api/v1/stakeholders/{stakeholderId}/communications", new { communicationTypeId, frequency = "Weekly", channel = "Email" });

        var deleteResponse = await client.DeleteAsync($"/api/v1/stakeholders/{stakeholderId}/communications/{communicationTypeId}");

        deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var listResponse = await client.GetAsync($"/api/v1/stakeholders/{stakeholderId}/communications");
        var listBody = await listResponse.Content.ReadFromJsonAsync<JsonElement>();
        listBody.EnumerateArray().Should().BeEmpty();
    }

    // AC 4: Endpunkte sind für PL, Coreteam, Architect erreichbar; für User liefern sie 403 Forbidden.
    [Fact]
    public async Task AC4_PlCoreteamArchitect_CanManageAssignments_UserReceivesForbidden()
    {
        var (stakeholderId, plUserId, coreteamUserId, architectUserId, userUserId, communicationTypeId) = await CreateStakeholderWithAllRolesAsync();

        // Ein weiterer Katalogeintrag je Rolle, um Duplikat-Konflikte zwischen den Testschritten zu vermeiden.
        var (coreteamCommunicationTypeId, architectCommunicationTypeId) = await CreateTwoMoreCommunicationTypesAsync();

        using var plClient = AuthenticatedClient(plUserId);
        var plResponse = await plClient.PostAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/communications", new { communicationTypeId, frequency = "Weekly", channel = "Email" });
        plResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        using var coreteamClient = AuthenticatedClient(coreteamUserId);
        var coreteamResponse = await coreteamClient.PostAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/communications",
            new { communicationTypeId = coreteamCommunicationTypeId, frequency = "Monthly", channel = "Meeting" });
        coreteamResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        using var architectClient = AuthenticatedClient(architectUserId);
        var architectResponse = await architectClient.PostAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/communications",
            new { communicationTypeId = architectCommunicationTypeId, frequency = "AdHoc", channel = "Report" });
        architectResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        using var userClient = AuthenticatedClient(userUserId);
        var userPostResponse = await userClient.PostAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/communications", new { communicationTypeId, frequency = "Weekly", channel = "Email" });
        userPostResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var userPatchResponse = await userClient.PatchAsJsonAsync(
            $"/api/v1/stakeholders/{stakeholderId}/communications/{communicationTypeId}", new { frequency = "Monthly", channel = "Meeting" });
        userPatchResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var userDeleteResponse = await userClient.DeleteAsync($"/api/v1/stakeholders/{stakeholderId}/communications/{communicationTypeId}");
        userDeleteResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    /// <summary>Erstellt ein Projekt mit PL-, Coreteam-, Architect- und User-Mitgliedschaft, einen
    /// Stakeholder darin sowie einen aktiven Katalogeintrag.</summary>
    private async Task<(Guid StakeholderId, Guid PlUserId, Guid CoreteamUserId, Guid ArchitectUserId, Guid UserUserId, Guid CommunicationTypeId)>
        CreateStakeholderWithAllRolesAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var plUser = User.Create("PL Nutzer", $"us040-pl-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        plUser.ChangePassword("correct-horse-battery-2");
        var coreteamUser = User.Create("Coreteam Nutzer", $"us040-coreteam-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        coreteamUser.ChangePassword("correct-horse-battery-2");
        var architectUser = User.Create("Architect Nutzer", $"us040-architect-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        architectUser.ChangePassword("correct-horse-battery-2");
        var userUser = User.Create("User Nutzer", $"us040-user-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        userUser.ChangePassword("correct-horse-battery-2");
        dbContext.Users.AddRange(plUser, coreteamUser, architectUser, userUser);

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        project.AssignMember(plUser.Id, ProjectRole.PL);
        project.AssignMember(coreteamUser.Id, ProjectRole.Coreteam);
        project.AssignMember(architectUser.Id, ProjectRole.Architect);
        project.AssignMember(userUser.Id, ProjectRole.User);
        dbContext.Projects.Add(project);

        var stakeholder = Stakeholder.Create(project.Id, StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, plUser.Id);
        dbContext.Stakeholders.Add(stakeholder);

        var communicationType = CommunicationType.Create($"Newsletter-{Guid.NewGuid():N}");
        dbContext.Add(communicationType);

        await dbContext.SaveChangesAsync();

        return (stakeholder.Id, plUser.Id, coreteamUser.Id, architectUser.Id, userUser.Id, communicationType.Id);
    }

    private async Task<(Guid CoreteamCommunicationTypeId, Guid ArchitectCommunicationTypeId)> CreateTwoMoreCommunicationTypesAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var coreteamType = CommunicationType.Create($"Statusbericht-{Guid.NewGuid():N}");
        var architectType = CommunicationType.Create($"Architekturreview-{Guid.NewGuid():N}");
        dbContext.AddRange(coreteamType, architectType);
        await dbContext.SaveChangesAsync();

        return (coreteamType.Id, architectType.Id);
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
