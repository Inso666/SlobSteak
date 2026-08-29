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

namespace SlobSteak.Api.Tests.DistributionLists;

/// <summary>
/// Integrationstests für <c>GET /api/v1/projects/{projectId}/distribution-list</c> (US-041) über
/// eine echte Testcontainers-PostgreSQL-Instanz — ergänzend zum dedizierten Story-Test
/// <c>US041_DistributionListApiTests</c>: hier liegt der Fokus auf Details des Response-Contracts
/// und Randfällen (ungültige Filterwerte, fehlendes Token, Projekt-Isolation, mehrere Zuordnungen je
/// Stakeholder), nicht auf den Akzeptanzkriterien selbst.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class DistributionListControllerTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-distribution-list-controller-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public DistributionListControllerTests(PostgresContainerFixture postgres)
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

    [Fact]
    public async Task GetDistributionList_NoToken_ReturnsUnauthorized()
    {
        var (projectId, _) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        using var client = _factory.CreateClient();

        var response = await client.GetAsync($"/api/v1/projects/{projectId}/distribution-list");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetDistributionList_InvalidFilterValues_AreIgnored_ReturnsUnfilteredList()
    {
        var (projectId, plUserId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var communicationType = CommunicationType.Create($"Newsletter-{Guid.NewGuid():N}");
            var stakeholder = Stakeholder.Create(projectId, StakeholderType.Person, "Anna", null, null, null, null, null, null, plUserId);
            stakeholder.AssignCommunication(communicationType.Id, CommunicationFrequency.Monthly, CommunicationChannel.Email);
            dbContext.Add(communicationType);
            dbContext.Stakeholders.Add(stakeholder);
            await dbContext.SaveChangesAsync();
        }

        using var client = AuthenticatedClient(plUserId);
        var response = await client.GetAsync(
            $"/api/v1/projects/{projectId}/distribution-list?frequency=NichtExistent&channel=NichtExistent&stakeholderType=NichtExistent");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetArrayLength().Should().Be(1);
    }

    [Fact]
    public async Task GetDistributionList_StakeholderWithMultipleAssignments_ReturnsOneEntryPerAssignment()
    {
        var (projectId, plUserId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        Guid stakeholderId;
        Guid newsletterId;
        Guid statusReportId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var newsletter = CommunicationType.Create($"Newsletter-{Guid.NewGuid():N}");
            var statusReport = CommunicationType.Create($"Statusbericht-{Guid.NewGuid():N}");
            var stakeholder = Stakeholder.Create(projectId, StakeholderType.Person, "Anna", null, null, "anna@example.com", null, null, null, plUserId);
            stakeholder.AssignCommunication(newsletter.Id, CommunicationFrequency.Monthly, CommunicationChannel.Email);
            stakeholder.AssignCommunication(statusReport.Id, CommunicationFrequency.Weekly, CommunicationChannel.Report);
            dbContext.AddRange(newsletter, statusReport);
            dbContext.Stakeholders.Add(stakeholder);
            await dbContext.SaveChangesAsync();
            stakeholderId = stakeholder.Id;
            newsletterId = newsletter.Id;
            statusReportId = statusReport.Id;
        }

        using var client = AuthenticatedClient(plUserId);
        var response = await client.GetAsync($"/api/v1/projects/{projectId}/distribution-list");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetArrayLength().Should().Be(2);
        var entries = body.EnumerateArray().ToList();
        entries.Should().OnlyContain(e => e.GetProperty("stakeholderId").GetGuid() == stakeholderId);
        entries.Select(e => e.GetProperty("communicationTypeId").GetGuid()).Should().BeEquivalentTo(new[] { newsletterId, statusReportId });
    }

    [Fact]
    public async Task GetDistributionList_StakeholderWithoutAnyAssignment_IsNotIncluded()
    {
        var (projectId, plUserId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            dbContext.Stakeholders.Add(
                Stakeholder.Create(projectId, StakeholderType.Person, "Ohne Zuordnung", null, null, null, null, null, null, plUserId));
            await dbContext.SaveChangesAsync();
        }

        using var client = AuthenticatedClient(plUserId);
        var response = await client.GetAsync($"/api/v1/projects/{projectId}/distribution-list");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task GetDistributionList_ResponseContainsCommunicationTypeName()
    {
        var (projectId, plUserId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        var communicationTypeName = $"Newsletter-{Guid.NewGuid():N}";
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var communicationType = CommunicationType.Create(communicationTypeName);
            var stakeholder = Stakeholder.Create(projectId, StakeholderType.Organization, "ACME GmbH", null, null, null, null, null, null, plUserId);
            stakeholder.AssignCommunication(communicationType.Id, CommunicationFrequency.AdHoc, CommunicationChannel.Meeting);
            dbContext.Add(communicationType);
            dbContext.Stakeholders.Add(stakeholder);
            await dbContext.SaveChangesAsync();
        }

        using var client = AuthenticatedClient(plUserId);
        var response = await client.GetAsync($"/api/v1/projects/{projectId}/distribution-list");

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var entry = body.EnumerateArray().Single();
        entry.GetProperty("communicationTypeName").GetString().Should().Be(communicationTypeName);
        entry.GetProperty("stakeholderType").GetString().Should().Be("Organization");
    }

    [Fact]
    public async Task GetDistributionList_OtherProjectsStakeholders_AreNotIncluded()
    {
        var (projectId, plUserId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        var (otherProjectId, otherPlUserId) = await CreateProjectWithMemberAsync(ProjectRole.PL);

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var communicationType = CommunicationType.Create($"Newsletter-{Guid.NewGuid():N}");
            var otherStakeholder = Stakeholder.Create(
                otherProjectId, StakeholderType.Person, "Fremdes Projekt", null, null, null, null, null, null, otherPlUserId);
            otherStakeholder.AssignCommunication(communicationType.Id, CommunicationFrequency.Weekly, CommunicationChannel.Email);
            dbContext.Add(communicationType);
            dbContext.Stakeholders.Add(otherStakeholder);
            await dbContext.SaveChangesAsync();
        }

        using var client = AuthenticatedClient(plUserId);
        var response = await client.GetAsync($"/api/v1/projects/{projectId}/distribution-list");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task GetDistributionList_FiltersAreCaseInsensitive()
    {
        var (projectId, plUserId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var communicationType = CommunicationType.Create($"Newsletter-{Guid.NewGuid():N}");
            var stakeholder = Stakeholder.Create(projectId, StakeholderType.Person, "Anna", null, null, null, null, null, null, plUserId);
            stakeholder.AssignCommunication(communicationType.Id, CommunicationFrequency.Monthly, CommunicationChannel.Email);
            dbContext.Add(communicationType);
            dbContext.Stakeholders.Add(stakeholder);
            await dbContext.SaveChangesAsync();
        }

        using var client = AuthenticatedClient(plUserId);
        var response = await client.GetAsync($"/api/v1/projects/{projectId}/distribution-list?frequency=monthly&channel=email&stakeholderType=person");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetArrayLength().Should().Be(1);
    }

    private async Task<(Guid ProjectId, Guid UserId)> CreateProjectWithMemberAsync(ProjectRole role)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var user = User.Create($"Nutzer-{Guid.NewGuid():N}", $"distribution-list-controller-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        user.ChangePassword("correct-horse-battery-2");
        dbContext.Users.Add(user);

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        project.AssignMember(user.Id, role);
        dbContext.Projects.Add(project);

        await dbContext.SaveChangesAsync();

        return (project.Id, user.Id);
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
