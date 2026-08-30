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
/// Dedizierter Story-Test für US-072 (Stakeholder- und Admin-Listen als Tabellen statt
/// Karten-Raster) — ausschließlich der Backend-Anteil: die additive Erweiterung von
/// <c>StakeholderResponse</c>/<c>StakeholderListItem</c> um <c>communicationTypeNames</c> und
/// deren Rollen-Sichtbarkeitsgrenze (identisch zu US-040). Alle übrigen Akzeptanzkriterien dieser
/// Story sind reine Frontend-/UI-Anteile (Tabellen-Umbau der drei Screens) und werden durch die
/// Angular-`TestBed`-Story-Tests (<c>us-072-stakeholder-admin-listen-tabellen.spec.ts</c> etc.)
/// abgedeckt, siehe Story-Datei Abschnitt „Übergreifend".
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US072_StakeholderAdminListenTabellenTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us072-story-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public US072_StakeholderAdminListenTabellenTests(PostgresContainerFixture postgres)
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

    // Stakeholder-Liste, Akzeptanzkriterium 6 / Übergreifende Akzeptanzkriterien
    // ("Backend-Test (xUnit) belegt: communicationTypeNames korrekt befüllt für
    // PL/Coreteam/Architect, leeres Array für User") — zusammengefasst als eine Theory über alle
    // vier Rollen, exakt wie in der Story-Datei gefordert ("Backend-Test MUSS dies explizit gegen
    // alle vier Rollen verifizieren").
    [Theory]
    [InlineData(ProjectRole.PL, true)]
    [InlineData(ProjectRole.Coreteam, true)]
    [InlineData(ProjectRole.Architect, true)]
    [InlineData(ProjectRole.User, false)]
    public async Task AC_CommunicationTypeNames_PopulatedOnlyForPerspectiveRoles_EmptyForUser(
        ProjectRole role, bool expectPopulated)
    {
        var (projectId, userId, stakeholderId) = await CreateProjectWithStakeholderAndMemberAsync(role);

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var communicationType = new CommunicationType(Guid.NewGuid(), $"Newsletter-{Guid.NewGuid():N}", isActive: true, DateTimeOffset.UtcNow);
            dbContext.CommunicationTypes.Add(communicationType);
            await dbContext.SaveChangesAsync();

            dbContext.StakeholderCommunicationAssignments.Add(new StakeholderCommunicationAssignment(
                Guid.NewGuid(), stakeholderId, communicationType.Id, CommunicationFrequency.Monthly, CommunicationChannel.Email));
            await dbContext.SaveChangesAsync();
        }

        using var client = AuthenticatedClient(userId);
        var response = await client.GetAsync($"/api/v1/projects/{projectId}/stakeholders");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var entry = body.EnumerateArray().Single(e => e.GetProperty("id").GetGuid() == stakeholderId);
        var communicationTypeNames = entry.GetProperty("communicationTypeNames").EnumerateArray().Select(v => v.GetString()).ToList();

        if (expectPopulated)
        {
            communicationTypeNames.Should().ContainSingle();
        }
        else
        {
            communicationTypeNames.Should().BeEmpty();
        }
    }

    private async Task<(Guid ProjectId, Guid UserId, Guid StakeholderId)> CreateProjectWithStakeholderAndMemberAsync(ProjectRole role)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var user = User.Create("Zielnutzer", $"us072-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        user.ChangePassword("correct-horse-battery-2");
        dbContext.Users.Add(user);

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        project.AssignMember(user.Id, role);
        dbContext.Projects.Add(project);

        var stakeholder = Stakeholder.Create(
            project.Id, StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, user.Id);
        dbContext.Stakeholders.Add(stakeholder);

        await dbContext.SaveChangesAsync();

        return (project.Id, user.Id, stakeholder.Id);
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
