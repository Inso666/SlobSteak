using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SlobSteak.Api.Tests.Persistence;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Stakeholders;
using SlobSteak.Infrastructure.Persistence;

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-020 (Stakeholder-Aggregate, Domain Model). Prüft ausschließlich
/// die in <c>docs/usecases/US-020-stakeholder-aggregate.md</c> gelisteten Akzeptanzkriterien, ein
/// <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie im Story-Dokument.
/// AC 1–7 sind reines Domain-Verhalten (siehe auch <c>StakeholderTests</c> in
/// <c>SlobSteak.Domain.Tests</c> für weitere Detail-Fälle, z. B. Idempotenz von
/// <see cref="Stakeholder.SoftDelete"/> bei mehrfachem Aufruf); AC 8 (Repository) läuft als
/// Integrationstest gegen eine echte Testcontainers-PostgreSQL-Instanz, analog zu
/// US010_ProjectAggregateTests.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US020_StakeholderAggregateTests : IAsyncLifetime
{
    private readonly SlobSteakApiFactory _factory;

    public US020_StakeholderAggregateTests(PostgresContainerFixture postgres)
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

    // AC 1: Stakeholder.Create(projectId, type, name, ...optionaleFelder, createdBy) wirft
    // StakeholderNameRequiredError, wenn name leer ist.
    [Fact]
    public void AC1_Create_BlankName_ThrowsStakeholderNameRequiredError()
    {
        var act = () => Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "   ", null, null, null, null, null, null, Guid.NewGuid());

        act.Should().Throw<StakeholderNameRequiredError>();
    }

    // AC 2: Stakeholder.Create wirft InvalidEmailFormatError (Wiederverwendung Email-VO), wenn
    // email gesetzt, aber ungültig formatiert ist; leeres email-Feld ist zulässig (nullable).
    [Fact]
    public void AC2_Create_InvalidEmailFormat_ThrowsInvalidEmailFormatError_BlankEmailIsAllowed()
    {
        var act = () => Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, "keine-email",
            null, null, null, Guid.NewGuid());
        act.Should().Throw<InvalidEmailFormatError>();

        var stakeholder = Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, null,
            null, null, null, Guid.NewGuid());
        stakeholder.Email.Should().BeNull();
    }

    // AC 3: type = Organization erlaubt position weiterhin als optionales Feld (keine
    // Domain-Restriktion, rein UI-seitig ausblendbar).
    [Fact]
    public void AC3_Create_OrganizationType_StillAcceptsPosition()
    {
        var stakeholder = Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Organization, "ACME GmbH", null, "Hauptsitz", null,
            null, null, null, Guid.NewGuid());

        stakeholder.Position.Should().Be("Hauptsitz");
    }

    // AC 4: Stakeholder.UpdateDetails(fields, updatedBy) aktualisiert updated_by/updated_at bei
    // jeder Änderung.
    [Fact]
    public void AC4_UpdateDetails_UpdatesUpdatedByAndUpdatedAt()
    {
        var stakeholder = Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid());
        var updatedBy = Guid.NewGuid();

        stakeholder.UpdateDetails(StakeholderType.Person, "Neuer Name", null, null, null, null, null, null, updatedBy);

        stakeholder.Name.Should().Be("Neuer Name");
        stakeholder.UpdatedBy.Should().Be(updatedBy);
    }

    // AC 5: Stakeholder.SoftDelete(deletedBy) setzt deleted_at/deleted_by; erneuter Aufruf auf
    // einem bereits gelöschten Stakeholder ist idempotent und ändert deleted_at nicht.
    [Fact]
    public void AC5_SoftDelete_SetsFields_AndIsIdempotentOnRepeatedCall()
    {
        var stakeholder = Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid());

        stakeholder.SoftDelete(Guid.NewGuid());
        stakeholder.DeletedAt.Should().NotBeNull();
        var firstDeletedAt = stakeholder.DeletedAt;

        stakeholder.SoftDelete(Guid.NewGuid());
        stakeholder.DeletedAt.Should().Be(firstDeletedAt);
    }

    // AC 6: Stakeholder.Restore() setzt deleted_at/deleted_by auf null zurück.
    [Fact]
    public void AC6_Restore_ClearsDeletedAtAndDeletedBy()
    {
        var stakeholder = Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid());
        stakeholder.SoftDelete(Guid.NewGuid());

        stakeholder.Restore();

        stakeholder.DeletedAt.Should().BeNull();
        stakeholder.DeletedBy.Should().BeNull();
    }

    // AC 7: Stakeholder.IsDeleted() gibt true zurück, wenn deleted_at gesetzt ist.
    [Fact]
    public void AC7_IsDeleted_ReflectsDeletedAt()
    {
        var stakeholder = Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid());
        stakeholder.IsDeleted().Should().BeFalse();

        stakeholder.SoftDelete(Guid.NewGuid());
        stakeholder.IsDeleted().Should().BeTrue();
    }

    // AC 8: Repository-Interface IStakeholderRepository mit FindById (inkl. gelöschter, optional
    // per Flag), FindActiveByProject, FindDeletedByProject, Save, ExistsSimilarNameInProject ist
    // definiert und durch eine SQL-Implementierung erfüllt.
    [Fact]
    public async Task AC8_StakeholderRepository_AllMethods_WorkAgainstRealDatabase()
    {
        using var scope = _factory.Services.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IStakeholderRepository>();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        dbContext.Projects.Add(project);

        // stakeholders.created_by/updated_by/deleted_by haben einen FK auf users — daher ein
        // echtes User-Konto nötig, nicht nur ein beliebiger Guid.
        var user = Domain.Identity.User.Create("Ersteller", $"us020-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        var createdBy = user.Id;
        var active = Stakeholder.Create(project.Id, StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, createdBy);
        var toBeDeleted = Stakeholder.Create(project.Id, StakeholderType.Person, "Erika Musterfrau", null, null, null, null, null, null, createdBy);

        await repository.SaveAsync(active);
        await repository.SaveAsync(toBeDeleted);

        var byId = await repository.FindByIdAsync(active.Id);
        byId.Should().NotBeNull();
        byId!.Name.Should().Be("Max Mustermann");

        var activeList = await repository.FindActiveByProjectAsync(project.Id);
        activeList.Should().Contain(s => s.Id == active.Id);
        activeList.Should().Contain(s => s.Id == toBeDeleted.Id);

        toBeDeleted.SoftDelete(createdBy);
        await repository.SaveAsync(toBeDeleted);

        var deletedWithoutFlag = await repository.FindByIdAsync(toBeDeleted.Id);
        deletedWithoutFlag.Should().BeNull();

        var deletedWithFlag = await repository.FindByIdAsync(toBeDeleted.Id, includeDeleted: true);
        deletedWithFlag.Should().NotBeNull();

        var activeAfterDelete = await repository.FindActiveByProjectAsync(project.Id);
        activeAfterDelete.Should().NotContain(s => s.Id == toBeDeleted.Id);

        var deletedList = await repository.FindDeletedByProjectAsync(project.Id);
        deletedList.Should().ContainSingle(s => s.Id == toBeDeleted.Id);

        // Case-insensitiv, inklusive soft-gelöschter Datensätze (PRD Abschnitt 4.3: Hinweis auf
        // bereits gelöschten, ähnlich benannten Stakeholder).
        (await repository.ExistsSimilarNameInProjectAsync(project.Id, "erika musterfrau")).Should().BeTrue();
        (await repository.ExistsSimilarNameInProjectAsync(project.Id, "Unbekannter Name")).Should().BeFalse();
        (await repository.ExistsSimilarNameInProjectAsync(project.Id, "Max Mustermann", excludeStakeholderId: active.Id)).Should().BeFalse();
    }
}
