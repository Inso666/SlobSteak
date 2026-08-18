using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SlobSteak.Api.Tests.Persistence;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-010 (Project-Aggregate, Domain Model). Prüft ausschließlich die
/// in <c>docs/usecases/US-010-project-aggregate.md</c> gelisteten Akzeptanzkriterien, ein
/// <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie im Story-Dokument.
/// AC 1–3 sind reines Domain-Verhalten (siehe auch <c>ProjectTests</c> in
/// <c>SlobSteak.Domain.Tests</c>); AC 4 (Repository) läuft als Integrationstest gegen eine echte
/// Testcontainers-PostgreSQL-Instanz, analog zu US004_UserAggregateTests.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US010_ProjectAggregateTests : IAsyncLifetime
{
    private readonly SlobSteakApiFactory _factory;

    public US010_ProjectAggregateTests(PostgresContainerFixture postgres)
    {
        _factory = SlobSteakApiFactory.WithConnectionString(postgres.ConnectionString);
    }

    public async Task InitializeAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<Infrastructure.Persistence.SlobSteakDbContext>();
        await dbContext.Database.MigrateAsync();
    }

    public Task DisposeAsync()
    {
        _factory.Dispose();
        return Task.CompletedTask;
    }

    // AC 1: Project.Create(name, description) erzeugt eine Instanz mit status = active.
    [Fact]
    public void AC1_Create_ProducesInstanceWithActiveStatus()
    {
        var project = Project.Create("Projekt Phoenix", "Beschreibung");

        project.Status.Should().Be(ProjectStatus.Active);
    }

    // AC 2: Project.Create wirft ProjectNameRequiredError, wenn name leer oder nur Leerzeichen ist.
    [Fact]
    public void AC2_Create_WithBlankName_ThrowsProjectNameRequiredError()
    {
        var act = () => Project.Create("   ", null);

        act.Should().Throw<ProjectNameRequiredError>();
    }

    // AC 3: Project.Archive() setzt status auf archived; Project.Reactivate() setzt ihn zurück auf
    // active.
    [Fact]
    public void AC3_ArchiveAndReactivate_ToggleStatus()
    {
        var project = Project.Create("Projekt Phoenix", null);

        project.Archive();
        project.Status.Should().Be(ProjectStatus.Archived);

        project.Reactivate();
        project.Status.Should().Be(ProjectStatus.Active);
    }

    // AC 4: Repository-Interface ProjectRepository mit FindById, Save, FindAll,
    // FindByMemberUserId ist definiert; Infrastruktur-Implementierung gegen projects erfüllt das
    // Interface (Integrationstest).
    [Fact]
    public async Task AC4_ProjectRepository_FindByIdSaveFindAllFindByMemberUserId_WorkAgainstRealDatabase()
    {
        using var scope = _factory.Services.CreateScope();
        var projectRepository = scope.ServiceProvider.GetRequiredService<IProjectRepository>();
        var dbContext = scope.ServiceProvider.GetRequiredService<Infrastructure.Persistence.SlobSteakDbContext>();

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        await projectRepository.SaveAsync(project);

        var byId = await projectRepository.FindByIdAsync(project.Id);
        byId.Should().NotBeNull();
        byId!.Id.Should().Be(project.Id);

        var all = await projectRepository.FindAllAsync();
        all.Should().Contain(p => p.Id == project.Id);

        var user = new Domain.Identity.User(
            Guid.NewGuid(), "Mitglied", new Domain.Shared.ValueObjects.Email($"member-{Guid.NewGuid():N}@example.com"),
            "hash", false, false, DateTimeOffset.UtcNow);
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();
        dbContext.ProjectMemberships.Add(new ProjectMembership(Guid.NewGuid(), project.Id, user.Id, ProjectRole.PL));
        await dbContext.SaveChangesAsync();

        var byMember = await projectRepository.FindByMemberUserIdAsync(user.Id);
        byMember.Should().ContainSingle(p => p.Id == project.Id);
    }
}
