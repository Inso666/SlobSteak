using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SlobSteak.Api.Tests.Persistence;
using SlobSteak.Domain.Assessments;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Stakeholders;
using SlobSteak.Infrastructure.Persistence;

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-027 (StakeholderAssessment-Aggregate, Domain Model, Invarianten).
/// Prüft ausschließlich die in <c>docs/usecases/US-027-assessment-aggregate.md</c> gelisteten
/// Akzeptanzkriterien, ein <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie
/// im Story-Dokument. AC 1–4 sind reines Domain-Verhalten (siehe auch
/// <c>StakeholderAssessmentTests</c> in <c>SlobSteak.Domain.Tests</c> für weitere Detail-Fälle);
/// AC 5 (Repository, inkl. DB-Unique-Constraint) läuft als Integrationstest gegen eine echte
/// Testcontainers-PostgreSQL-Instanz, analog zu US020_StakeholderAggregateTests.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US027_AssessmentAggregateTests : IAsyncLifetime
{
    private readonly SlobSteakApiFactory _factory;

    public US027_AssessmentAggregateTests(PostgresContainerFixture postgres)
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

    // AC 1: StakeholderAssessment.Create(stakeholderId, role, influence, interest, notes,
    // updatedBy) akzeptiert für role ausschließlich PL, Coreteam, Architect (nicht User); ein
    // anderer Wert wirft InvalidAssessmentRoleError.
    [Fact]
    public void AC1_Create_RoleUser_ThrowsInvalidAssessmentRoleError_PerspectiveBearingRolesSucceed()
    {
        var act = () => StakeholderAssessment.Create(Guid.NewGuid(), ProjectRole.User, 50, 50, null, Guid.NewGuid());
        act.Should().Throw<InvalidAssessmentRoleError>();

        foreach (var role in new[] { ProjectRole.PL, ProjectRole.Coreteam, ProjectRole.Architect })
        {
            var assessment = StakeholderAssessment.Create(Guid.NewGuid(), role, 50, 50, null, Guid.NewGuid());
            assessment.Role.Should().Be(role);
        }
    }

    // AC 2: influence und interest sind Score-Value-Objects (0–100, Wiederverwendung US-002);
    // ungültige Werte werfen InvalidScoreRangeError.
    [Fact]
    public void AC2_Create_InfluenceAndInterest_AreScoreValueObjects_InvalidValuesThrow()
    {
        var assessment = StakeholderAssessment.Create(Guid.NewGuid(), ProjectRole.PL, 0, 100, null, Guid.NewGuid());
        assessment.Influence.Value.Should().Be(0);
        assessment.Interest.Value.Should().Be(100);

        var actInfluence = () => StakeholderAssessment.Create(Guid.NewGuid(), ProjectRole.PL, 101, 50, null, Guid.NewGuid());
        actInfluence.Should().Throw<InvalidScoreRangeError>();

        var actInterest = () => StakeholderAssessment.Create(Guid.NewGuid(), ProjectRole.PL, 50, -1, null, Guid.NewGuid());
        actInterest.Should().Throw<InvalidScoreRangeError>();
    }

    // AC 3: StakeholderAssessment.Update(influence, interest, notes, updatedBy, expectedVersion)
    // aktualisiert die Werte sowie updated_by/updated_at und erhöht eine interne Versionsnummer.
    [Fact]
    public void AC3_Update_UpdatesValuesAndUpdatedByAndAt_IncrementsVersion()
    {
        var assessment = StakeholderAssessment.Create(Guid.NewGuid(), ProjectRole.PL, 10, 20, "Alt", Guid.NewGuid());
        var updatedBy = Guid.NewGuid();
        var updatedAtBefore = assessment.UpdatedAt;

        assessment.Update(90, 95, "Neue Notiz", updatedBy, expectedVersion: 1);

        assessment.Influence.Value.Should().Be(90);
        assessment.Interest.Value.Should().Be(95);
        assessment.Notes.Should().Be("Neue Notiz");
        assessment.UpdatedBy.Should().Be(updatedBy);
        assessment.UpdatedAt.Should().BeOnOrAfter(updatedAtBefore);
        assessment.Version.Should().Be(2);
    }

    // AC 4: StakeholderAssessment.Update wirft StaleAssessmentError, wenn expectedVersion nicht
    // der aktuell persistierten Version entspricht.
    [Fact]
    public void AC4_Update_MismatchedExpectedVersion_ThrowsStaleAssessmentError()
    {
        var assessment = StakeholderAssessment.Create(Guid.NewGuid(), ProjectRole.PL, 10, 20, null, Guid.NewGuid());

        var act = () => assessment.Update(90, 95, null, Guid.NewGuid(), expectedVersion: 42);

        act.Should().Throw<StaleAssessmentError>();
    }

    // AC 5: Repository-Interface StakeholderAssessmentRepository mit FindByStakeholderAndRole,
    // FindAllByStakeholder, Save ist definiert; SQL-Implementierung erfüllt Unique Constraint
    // (stakeholder_id, role) aus US-003.
    [Fact]
    public async Task AC5_Repository_AllMethods_WorkAgainstRealDatabase_EnforcesUniqueConstraint()
    {
        using var scope = _factory.Services.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IStakeholderAssessmentRepository>();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        dbContext.Projects.Add(project);
        var user = Domain.Identity.User.Create("Bewerter", $"us027-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        dbContext.Users.Add(user);
        var stakeholder = Stakeholder.Create(project.Id, StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, user.Id);
        dbContext.Stakeholders.Add(stakeholder);
        await dbContext.SaveChangesAsync();

        var assessment = StakeholderAssessment.Create(stakeholder.Id, ProjectRole.PL, 40, 60, "Notiz", user.Id);
        await repository.SaveAsync(assessment);

        var byStakeholderAndRole = await repository.FindByStakeholderAndRoleAsync(stakeholder.Id, ProjectRole.PL);
        byStakeholderAndRole.Should().NotBeNull();
        byStakeholderAndRole!.Influence.Value.Should().Be(40);

        var byRoleWithoutAssessment = await repository.FindByStakeholderAndRoleAsync(stakeholder.Id, ProjectRole.Architect);
        byRoleWithoutAssessment.Should().BeNull();

        var secondAssessment = StakeholderAssessment.Create(stakeholder.Id, ProjectRole.Coreteam, 70, 80, null, user.Id);
        await repository.SaveAsync(secondAssessment);

        var all = await repository.FindAllByStakeholderAsync(stakeholder.Id);
        all.Should().HaveCount(2).And.Contain(a => a.Role == ProjectRole.PL).And.Contain(a => a.Role == ProjectRole.Coreteam);

        // Unique Constraint (stakeholder_id, role) aus US-003: ein zweites Assessment derselben
        // Rolle für denselben Stakeholder wird von der Datenbank abgelehnt.
        var duplicateRoleAssessment = StakeholderAssessment.Create(stakeholder.Id, ProjectRole.PL, 10, 10, null, user.Id);
        var act = async () => await repository.SaveAsync(duplicateRoleAssessment);
        await act.Should().ThrowAsync<DbUpdateException>();
    }
}
