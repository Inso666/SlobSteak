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
using SlobSteak.Domain.Stakeholders;
using SlobSteak.Infrastructure.Persistence;

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-031 (Map-Query-API je Perspektive). Prüft ausschließlich die in
/// <c>docs/usecases/US-031-map-query-api.md</c> gelisteten Akzeptanzkriterien, ein
/// <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie im Story-Dokument, über
/// eine echte Testcontainers-PostgreSQL-Instanz — Konvention aus <c>.claude/agents/qa.md</c>
/// Abschnitt 1, analog zu <c>US028_AssessmentApiTests</c>/<c>US030_AssessmentSichtbarkeitUserTests</c>.
/// Ergänzend dazu deckt <c>Map/MapControllerTests.cs</c> (Story-Technik-Hinweis) Response-Contract-
/// Details und weitere Randfälle ab, die über die Akzeptanzkriterien hinausgehen.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US031_MapQueryApiTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us031-story-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public US031_MapQueryApiTests(PostgresContainerFixture postgres)
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

    // AC 1: GET /api/v1/projects/{projectId}/map?perspective={PL|Coreteam|Architect} liefert
    // ausschließlich aktive Stakeholder (deleted_at IS NULL), die in der gewählten Perspektive ein
    // Assessment besitzen, jeweils mit stakeholderId, name, influence, interest.
    [Fact]
    public async Task AC1_Get_ReturnsActiveStakeholdersWithAssessmentInPerspective_WithExpectedFields()
    {
        var (projectId, plUserId, assessedStakeholderId) = await CreateProjectWithAssessedStakeholderAsync();
        using var client = AuthenticatedClient(plUserId);

        var response = await client.GetAsync($"/api/v1/projects/{projectId}/map?perspective=PL");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetArrayLength().Should().Be(1);
        var entry = body[0];
        entry.GetProperty("stakeholderId").GetGuid().Should().Be(assessedStakeholderId);
        entry.GetProperty("name").GetString().Should().Be("Bewerteter Stakeholder");
        entry.GetProperty("influence").GetInt32().Should().Be(40);
        entry.GetProperty("interest").GetInt32().Should().Be(60);
    }

    // AC 2: Stakeholder ohne Assessment in der gewählten Perspektive sind nicht im Ergebnis
    // enthalten.
    [Fact]
    public async Task AC2_Get_ExcludesStakeholdersWithoutAssessmentInChosenPerspective()
    {
        var (projectId, plUserId, assessedStakeholderId) = await CreateProjectWithAssessedStakeholderAsync();
        using var client = AuthenticatedClient(plUserId);

        var response = await client.GetAsync($"/api/v1/projects/{projectId}/map?perspective=Coreteam");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetArrayLength().Should().Be(0);

        // Regressionsschutz: dieselbe Perspektive (PL), in der ein Assessment existiert, liefert
        // weiterhin den Eintrag — die Filterung ist perspektivspezifisch, nicht generell leer.
        var plResponse = await client.GetAsync($"/api/v1/projects/{projectId}/map?perspective=PL");
        var plBody = await plResponse.Content.ReadFromJsonAsync<JsonElement>();
        plBody.GetArrayLength().Should().Be(1);
        plBody[0].GetProperty("stakeholderId").GetGuid().Should().Be(assessedStakeholderId);
    }

    // AC 3: Endpoint liefert 403 Forbidden für Rolle User (Konsistenz mit US-030).
    [Fact]
    public async Task AC3_Get_UserRole_ReturnsForbidden()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var plUser = User.Create("PL Nutzer", $"us031-pl-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        plUser.ChangePassword("correct-horse-battery-2");
        var userRoleUser = User.Create("User-Rolle Nutzer", $"us031-user-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        userRoleUser.ChangePassword("correct-horse-battery-2");
        dbContext.Users.AddRange(plUser, userRoleUser);

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        project.AssignMember(plUser.Id, ProjectRole.PL);
        project.AssignMember(userRoleUser.Id, ProjectRole.User);
        dbContext.Projects.Add(project);

        await dbContext.SaveChangesAsync();

        using var client = AuthenticatedClient(userRoleUser.Id);
        var response = await client.GetAsync($"/api/v1/projects/{project.Id}/map?perspective=PL");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // AC 4: Fehlt der perspective-Query-Parameter, liefert der Endpoint 400 Bad Request.
    [Fact]
    public async Task AC4_Get_MissingPerspectiveParameter_ReturnsBadRequest()
    {
        var (projectId, plUserId, _) = await CreateProjectWithAssessedStakeholderAsync();
        using var client = AuthenticatedClient(plUserId);

        var response = await client.GetAsync($"/api/v1/projects/{projectId}/map");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // AC 5: Integrationstest deckt: Stakeholder mit/ohne Assessment in der Perspektive, gelöschter
    // Stakeholder erscheint nicht. Mit/ohne Assessment ist bereits durch AC 1/AC 2 abgedeckt; hier
    // ergänzend der Soft-Delete-Fall — ein gelöschter Stakeholder mit Assessment in der gewählten
    // Perspektive darf trotzdem nicht erscheinen (PRD Abschnitt 4.3 Punkt 5).
    [Fact]
    public async Task AC5_Get_ExcludesSoftDeletedStakeholder_EvenWithAssessmentInPerspective()
    {
        var (projectId, plUserId, assessedStakeholderId) = await CreateProjectWithAssessedStakeholderAsync();

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var stakeholder = await dbContext.Stakeholders.SingleAsync(s => s.Id == assessedStakeholderId);
            stakeholder.SoftDelete(plUserId);
            await dbContext.SaveChangesAsync();
        }

        using var client = AuthenticatedClient(plUserId);
        var response = await client.GetAsync($"/api/v1/projects/{projectId}/map?perspective=PL");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetArrayLength().Should().Be(0);
    }

    /// <summary>Erstellt ein Projekt mit PL-Mitgliedschaft, einen Stakeholder mit PL-Assessment
    /// (Einfluss 40 / Interesse 60) sowie einen zweiten Stakeholder ohne jegliches Assessment
    /// (Grundlage für AC 2).</summary>
    private async Task<(Guid ProjectId, Guid PlUserId, Guid AssessedStakeholderId)> CreateProjectWithAssessedStakeholderAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var plUser = User.Create("PL Nutzer", $"us031-pl-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        plUser.ChangePassword("correct-horse-battery-2");
        dbContext.Users.Add(plUser);

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        project.AssignMember(plUser.Id, ProjectRole.PL);
        dbContext.Projects.Add(project);

        var assessedStakeholder = Stakeholder.Create(
            project.Id, StakeholderType.Person, "Bewerteter Stakeholder", null, null, null, null, null, null, plUser.Id);
        var unassessedStakeholder = Stakeholder.Create(
            project.Id, StakeholderType.Person, "Unbewerteter Stakeholder", null, null, null, null, null, null, plUser.Id);
        dbContext.Stakeholders.AddRange(assessedStakeholder, unassessedStakeholder);

        var assessment = StakeholderAssessment.Create(assessedStakeholder.Id, ProjectRole.PL, 40, 60, null, plUser.Id);
        dbContext.StakeholderAssessments.Add(assessment);

        await dbContext.SaveChangesAsync();

        return (project.Id, plUser.Id, assessedStakeholder.Id);
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
