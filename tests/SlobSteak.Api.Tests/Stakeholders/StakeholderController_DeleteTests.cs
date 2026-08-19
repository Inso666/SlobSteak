using System.Net;
using System.Net.Http.Headers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using FluentAssertions;
using SlobSteak.Api.Auth;
using SlobSteak.Api.Tests.Persistence;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;
using SlobSteak.Infrastructure.Persistence;

namespace SlobSteak.Api.Tests.Stakeholders;

/// <summary>
/// Integrationstests für <c>DELETE /api/v1/stakeholders/{id}</c> und
/// <c>GET /api/v1/stakeholders/{id}/deletion-impact</c> (US-023) über eine echte
/// Testcontainers-PostgreSQL-Instanz — ergänzend zum dedizierten Story-Test
/// <c>US023_StakeholderSoftDeleteTests</c>: hier liegt der Fokus auf Randfällen (fehlendes Token,
/// nicht existierende Id), nicht auf den Akzeptanzkriterien selbst.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class StakeholderController_DeleteTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-stakeholder-delete-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public StakeholderController_DeleteTests(PostgresContainerFixture postgres)
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
    public async Task DeleteStakeholder_WithoutToken_Returns401()
    {
        using var client = _factory.CreateClient();

        var response = await client.DeleteAsync($"/api/v1/stakeholders/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task DeleteStakeholder_NonExistentId_Returns403_NotLeakingExistence()
    {
        // Kein Handler kann die Rolle für eine unbekannte Stakeholder-Id auflösen (kein Projekt
        // ermittelbar) — konsistent mit dem Verhalten anderer indirekt autorisierter Routen
        // (ADR-0007), kein separates 404 (kein Existenz-Leak über den Statuscode).
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { [JwtSettings.SigningKeyConfigurationKey] = SigningKey })
            .Build();
        var token = new JwtTokenGenerator(configuration).GenerateToken(Guid.NewGuid(), isSystemAdmin: false);
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.DeleteAsync($"/api/v1/stakeholders/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetDeletionImpact_WithoutToken_Returns401()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync($"/api/v1/stakeholders/{Guid.NewGuid()}/deletion-impact");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetDeletionImpact_NonPLRole_Returns403()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var user = User.Create("Zielnutzer", $"delete-tests-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        user.ChangePassword("correct-horse-battery-2");
        dbContext.Users.Add(user);

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        project.AssignMember(user.Id, ProjectRole.Coreteam);
        dbContext.Projects.Add(project);
        await dbContext.SaveChangesAsync();

        var stakeholder = Stakeholder.Create(
            project.Id, StakeholderType.Person, "Name", null, null, null, null, null, null, user.Id);
        dbContext.Stakeholders.Add(stakeholder);
        await dbContext.SaveChangesAsync();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { [JwtSettings.SigningKeyConfigurationKey] = SigningKey })
            .Build();
        var token = new JwtTokenGenerator(configuration).GenerateToken(user.Id, isSystemAdmin: false);
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync($"/api/v1/stakeholders/{stakeholder.Id}/deletion-impact");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
