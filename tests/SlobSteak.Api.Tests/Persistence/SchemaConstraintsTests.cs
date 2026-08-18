using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SlobSteak.Domain.Assessments;
using SlobSteak.Domain.Communications;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.ValueObjects;
using SlobSteak.Domain.Stakeholders;
using SlobSteak.Infrastructure.Persistence;

namespace SlobSteak.Api.Tests.Persistence;

/// <summary>
/// Integrationstest für US-003 (Datenbankschema & Migrationen): verifiziert gegen eine echte
/// Testcontainers-PostgreSQL-Instanz, dass die drei in den Akzeptanzkriterien geforderten
/// Unique-Indizes von PostgreSQL tatsächlich mit <see cref="DbUpdateException"/> durchgesetzt
/// werden — nicht nur in der EF-Core-Modellkonfiguration deklariert sind.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class SchemaConstraintsTests : IAsyncLifetime
{
    private readonly SlobSteakApiFactory _factory;

    public SchemaConstraintsTests(PostgresContainerFixture postgres)
    {
        _factory = SlobSteakApiFactory.WithConnectionString(postgres.ConnectionString);
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
    public async Task InsertingDuplicateProjectMembership_ForSameProjectAndUser_ThrowsDbUpdateException()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var user = NewUser();
        var project = NewProject();
        db.AddRange(user, project);
        await db.SaveChangesAsync();

        db.ProjectMemberships.Add(new ProjectMembership(Guid.NewGuid(), project.Id, user.Id, ProjectRole.PL));
        await db.SaveChangesAsync();

        db.ProjectMemberships.Add(new ProjectMembership(Guid.NewGuid(), project.Id, user.Id, ProjectRole.Coreteam));
        var act = async () => await db.SaveChangesAsync();

        await act.Should().ThrowAsync<DbUpdateException>();
    }

    [Fact]
    public async Task InsertingDuplicateStakeholderAssessment_ForSameStakeholderAndRole_ThrowsDbUpdateException()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var user = NewUser();
        var project = NewProject();
        db.AddRange(user, project);
        await db.SaveChangesAsync();

        var stakeholder = NewStakeholder(project.Id, user.Id);
        db.Stakeholders.Add(stakeholder);
        await db.SaveChangesAsync();

        db.StakeholderAssessments.Add(new StakeholderAssessment(
            Guid.NewGuid(), stakeholder.Id, ProjectRole.PL, new Score(40), new Score(60), null, user.Id, DateTimeOffset.UtcNow));
        await db.SaveChangesAsync();

        db.StakeholderAssessments.Add(new StakeholderAssessment(
            Guid.NewGuid(), stakeholder.Id, ProjectRole.PL, new Score(10), new Score(20), null, user.Id, DateTimeOffset.UtcNow));
        var act = async () => await db.SaveChangesAsync();

        await act.Should().ThrowAsync<DbUpdateException>();
    }

    [Fact]
    public async Task InsertingDuplicateStakeholderCommunicationAssignment_ForSameStakeholderAndType_ThrowsDbUpdateException()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var user = NewUser();
        var project = NewProject();
        db.AddRange(user, project);
        await db.SaveChangesAsync();

        var stakeholder = NewStakeholder(project.Id, user.Id);
        var communicationType = new CommunicationType(Guid.NewGuid(), $"Newsletter-{Guid.NewGuid():N}", true, DateTimeOffset.UtcNow);
        db.AddRange(stakeholder, communicationType);
        await db.SaveChangesAsync();

        db.StakeholderCommunicationAssignments.Add(new StakeholderCommunicationAssignment(
            Guid.NewGuid(), stakeholder.Id, communicationType.Id, CommunicationFrequency.Monthly, CommunicationChannel.Email));
        await db.SaveChangesAsync();

        db.StakeholderCommunicationAssignments.Add(new StakeholderCommunicationAssignment(
            Guid.NewGuid(), stakeholder.Id, communicationType.Id, CommunicationFrequency.Weekly, CommunicationChannel.Report));
        var act = async () => await db.SaveChangesAsync();

        await act.Should().ThrowAsync<DbUpdateException>();
    }

    private static User NewUser() => new(
        Guid.NewGuid(), "Testnutzer", new Email($"user-{Guid.NewGuid():N}@example.com"), "hash", false, false, DateTimeOffset.UtcNow);

    private static Project NewProject() => new(
        Guid.NewGuid(), $"Projekt-{Guid.NewGuid():N}", null, ProjectStatus.Active, DateTimeOffset.UtcNow);

    private static Stakeholder NewStakeholder(Guid projectId, Guid userId) => new(
        Guid.NewGuid(), projectId, StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null,
        userId, DateTimeOffset.UtcNow, userId, DateTimeOffset.UtcNow, null, null);
}
