using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SlobSteak.Api.Tests.Persistence;
using SlobSteak.Domain.Assessments;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Shared.ValueObjects;
using SlobSteak.Domain.Stakeholders;
using SlobSteak.Infrastructure.Persistence;

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-011 (ProjectMembership-Entity mit Rollen-Invariante). Prüft
/// ausschließlich die in <c>docs/usecases/US-011-project-membership.md</c> gelisteten
/// Akzeptanzkriterien, ein <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie
/// im Story-Dokument, über eine echte Testcontainers-PostgreSQL-Instanz.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US011_ProjectMembershipTests : IAsyncLifetime
{
    private readonly SlobSteakApiFactory _factory;

    public US011_ProjectMembershipTests(PostgresContainerFixture postgres)
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

    // AC 1: Project.AssignMember(userId, role) fügt eine ProjectMembership hinzu; existiert für
    // userId bereits eine Mitgliedschaft in diesem Projekt, wirft die Methode
    // MembershipAlreadyExistsError.
    [Fact]
    public void AC1_AssignMember_AddsMembership_AndThrowsMembershipAlreadyExistsErrorForDuplicateUser()
    {
        var project = Project.Create("Projekt Phoenix", null);
        var userId = Guid.NewGuid();

        project.AssignMember(userId, ProjectRole.PL);
        project.Memberships.Should().ContainSingle(m => m.UserId == userId);

        var act = () => project.AssignMember(userId, ProjectRole.Coreteam);
        act.Should().Throw<MembershipAlreadyExistsError>();
    }

    // AC 2: Project.ChangeMemberRole(userId, newRole) aktualisiert die Rolle einer bestehenden
    // Mitgliedschaft.
    [Fact]
    public void AC2_ChangeMemberRole_UpdatesRoleOfExistingMembership()
    {
        var project = Project.Create("Projekt Phoenix", null);
        var userId = Guid.NewGuid();
        project.AssignMember(userId, ProjectRole.PL);

        project.ChangeMemberRole(userId, ProjectRole.Architect);

        project.Memberships.Should().ContainSingle(m => m.UserId == userId && m.Role == ProjectRole.Architect);
    }

    // AC 3: Project.RemoveMember(userId) entfernt die Mitgliedschaft; ein Integrationstest
    // verifiziert, dass bereits erfasste stakeholder_assessments der zugehörigen Rolle davon
    // unberührt bleiben.
    [Fact]
    public async Task AC3_RemoveMember_RemovesMembership_ButLeavesStakeholderAssessmentsOfSameRoleUntouched()
    {
        Guid assessmentId;
        Guid projectId;
        Guid userId;

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var projectRepository = scope.ServiceProvider.GetRequiredService<IProjectRepository>();

            var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
            await projectRepository.SaveAsync(project);
            projectId = project.Id;

            var user = new User(
                Guid.NewGuid(), "Mitglied", new Email($"member-{Guid.NewGuid():N}@example.com"),
                "hash", false, false, DateTimeOffset.UtcNow);
            dbContext.Users.Add(user);
            await dbContext.SaveChangesAsync();
            userId = user.Id;

            var stakeholder = new Stakeholder(
                Guid.NewGuid(), project.Id, StakeholderType.Person, "Max Mustermann", null, null, null, null, null,
                null, user.Id, DateTimeOffset.UtcNow, user.Id, DateTimeOffset.UtcNow, null, null);
            dbContext.Stakeholders.Add(stakeholder);
            await dbContext.SaveChangesAsync();

            var assessment = new StakeholderAssessment(
                Guid.NewGuid(), stakeholder.Id, ProjectRole.PL, new Score(40), new Score(60), null, user.Id, DateTimeOffset.UtcNow);
            dbContext.StakeholderAssessments.Add(assessment);
            await dbContext.SaveChangesAsync();
            assessmentId = assessment.Id;

            var reloadedProject = await projectRepository.FindByIdAsync(project.Id);
            reloadedProject!.AssignMember(userId, ProjectRole.PL);
            await projectRepository.SaveAsync(reloadedProject);

            reloadedProject.RemoveMember(userId);
            await projectRepository.SaveAsync(reloadedProject);
        }

        using (var verifyScope = _factory.Services.CreateScope())
        {
            var dbContext = verifyScope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

            var project = await dbContext.ProjectMemberships.Where(m => m.ProjectId == projectId).ToListAsync();
            project.Should().BeEmpty();

            var assessment = await dbContext.StakeholderAssessments.SingleAsync(a => a.Id == assessmentId);
            assessment.Role.Should().Be(ProjectRole.PL);
            assessment.Influence.Should().Be(new Score(40));
            assessment.Interest.Should().Be(new Score(60));
        }
    }

    // AC 4: role akzeptiert ausschließlich Werte des ProjectRole-Enums (PL, Coreteam, Architect,
    // User) — kein Admin-Wert möglich.
    [Theory]
    [InlineData(ProjectRole.PL)]
    [InlineData(ProjectRole.Coreteam)]
    [InlineData(ProjectRole.Architect)]
    [InlineData(ProjectRole.User)]
    public void AC4_AssignMember_AcceptsAllFourProjectRoleValues_NoAdminValueExists(ProjectRole role)
    {
        var project = Project.Create("Projekt Phoenix", null);

        var act = () => project.AssignMember(Guid.NewGuid(), role);

        act.Should().NotThrow();
        Enum.GetNames<ProjectRole>().Should().NotContain("Admin");
    }

    // AC 5: Unique-Constraint-Verletzung (doppelte Mitgliedschaft) wird bei parallelem Zugriff von
    // der DB abgefangen und als MembershipAlreadyExistsError in eine fachliche Exception übersetzt
    // (Integrationstest mit gleichzeitigem Insert).
    [Fact]
    public async Task AC5_ConcurrentAssignMember_ForSameUser_SecondSaveThrowsMembershipAlreadyExistsError()
    {
        using var setupScope = _factory.Services.CreateScope();
        var setupRepository = setupScope.ServiceProvider.GetRequiredService<IProjectRepository>();
        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        await setupRepository.SaveAsync(project);

        // ProjectMembership.UserId trägt einen echten Fremdschlüssel auf users — für den
        // Unique-Constraint-Test muss der referenzierte Nutzer tatsächlich existieren.
        var user = new User(
            Guid.NewGuid(), "Konflikt-Nutzer", new Email($"conflict-{Guid.NewGuid():N}@example.com"),
            "hash", false, false, DateTimeOffset.UtcNow);
        var setupDbContext = setupScope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        setupDbContext.Users.Add(user);
        await setupDbContext.SaveChangesAsync();
        var userId = user.Id;

        using var scopeA = _factory.Services.CreateScope();
        var repositoryA = scopeA.ServiceProvider.GetRequiredService<IProjectRepository>();
        var projectA = await repositoryA.FindByIdAsync(project.Id);
        projectA!.AssignMember(userId, ProjectRole.PL);

        using var scopeB = _factory.Services.CreateScope();
        var repositoryB = scopeB.ServiceProvider.GetRequiredService<IProjectRepository>();
        var projectB = await repositoryB.FindByIdAsync(project.Id);
        projectB!.AssignMember(userId, ProjectRole.Coreteam);

        await repositoryA.SaveAsync(projectA);

        var act = async () => await repositoryB.SaveAsync(projectB);
        await act.Should().ThrowAsync<MembershipAlreadyExistsError>();
    }
}
