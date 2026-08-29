using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SlobSteak.Api.Tests.Persistence;
using SlobSteak.Domain.Communications;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Stakeholders;
using SlobSteak.Infrastructure.Persistence;

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-039 (StakeholderCommunicationAssignment-Entity, n:m, Invarianten).
/// Prüft ausschließlich die in
/// <c>docs/usecases/US-039-communication-assignment-entity.md</c> gelisteten Akzeptanzkriterien,
/// ein <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie im Story-Dokument.
/// AC 1–4 sind reines Domain-Verhalten (siehe auch <c>StakeholderCommunicationAssignmentTests</c>
/// in <c>SlobSteak.Domain.Tests</c> für weitere Detail-Fälle); AC 5 (DB-Unique-Constraint bei
/// parallelem Zugriff) läuft als Integrationstest gegen eine echte Testcontainers-PostgreSQL-
/// Instanz, analog zu US011_ProjectMembershipTests Akzeptanzkriterium 5.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US039_CommunicationAssignmentEntityTests : IAsyncLifetime
{
    private readonly SlobSteakApiFactory _factory;

    public US039_CommunicationAssignmentEntityTests(PostgresContainerFixture postgres)
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

    // AC 1: Stakeholder.AssignCommunication(communicationTypeId, frequency, channel) fügt eine
    // Zuordnung hinzu; existiert für dieselbe communicationTypeId bereits eine Zuordnung, wirft die
    // Methode AssignmentAlreadyExistsError (stattdessen muss Frequenz/Kanal per Update geändert
    // werden).
    [Fact]
    public void AC1_AssignCommunication_AddsAssignment_AndThrowsAssignmentAlreadyExistsErrorForDuplicate()
    {
        var stakeholder = CreateStakeholder();
        var communicationTypeId = Guid.NewGuid();

        stakeholder.AssignCommunication(communicationTypeId, CommunicationFrequency.Weekly, CommunicationChannel.Email);
        stakeholder.CommunicationAssignments.Should().ContainSingle(a => a.CommunicationTypeId == communicationTypeId);

        var act = () => stakeholder.AssignCommunication(communicationTypeId, CommunicationFrequency.Monthly, CommunicationChannel.Meeting);
        act.Should().Throw<AssignmentAlreadyExistsError>();
    }

    // AC 2: Stakeholder.UpdateCommunicationAssignment(communicationTypeId, frequency, channel)
    // aktualisiert eine bestehende Zuordnung.
    [Fact]
    public void AC2_UpdateCommunicationAssignment_UpdatesFrequencyAndChannelOfExistingAssignment()
    {
        var stakeholder = CreateStakeholder();
        var communicationTypeId = Guid.NewGuid();
        stakeholder.AssignCommunication(communicationTypeId, CommunicationFrequency.Weekly, CommunicationChannel.Email);

        stakeholder.UpdateCommunicationAssignment(communicationTypeId, CommunicationFrequency.Quarterly, CommunicationChannel.Report);

        stakeholder.CommunicationAssignments.Should().ContainSingle(a =>
            a.CommunicationTypeId == communicationTypeId &&
            a.Frequency == CommunicationFrequency.Quarterly &&
            a.Channel == CommunicationChannel.Report);
    }

    // AC 3: Stakeholder.RemoveCommunicationAssignment(communicationTypeId) entfernt eine Zuordnung.
    [Fact]
    public void AC3_RemoveCommunicationAssignment_RemovesAssignment()
    {
        var stakeholder = CreateStakeholder();
        var communicationTypeId = Guid.NewGuid();
        stakeholder.AssignCommunication(communicationTypeId, CommunicationFrequency.Weekly, CommunicationChannel.Email);

        stakeholder.RemoveCommunicationAssignment(communicationTypeId);

        stakeholder.CommunicationAssignments.Should().NotContain(a => a.CommunicationTypeId == communicationTypeId);
    }

    // AC 4: frequency und channel akzeptieren ausschließlich Werte der Enums aus US-002
    // (CommunicationFrequency, CommunicationChannel) — typsicher, keine Freitext-Strings.
    [Theory]
    [InlineData(CommunicationFrequency.Weekly, CommunicationChannel.Email)]
    [InlineData(CommunicationFrequency.Monthly, CommunicationChannel.Meeting)]
    [InlineData(CommunicationFrequency.Quarterly, CommunicationChannel.Report)]
    [InlineData(CommunicationFrequency.AdHoc, CommunicationChannel.Email)]
    public void AC4_AssignCommunication_AcceptsOnlyTypedEnumValues(CommunicationFrequency frequency, CommunicationChannel channel)
    {
        var stakeholder = CreateStakeholder();

        var act = () => stakeholder.AssignCommunication(Guid.NewGuid(), frequency, channel);

        act.Should().NotThrow();
    }

    // AC 5: Integrationstest verifiziert die DB-seitige Unique-Constraint-Durchsetzung
    // (stakeholder_id, communication_type_id) bei parallelem Insert.
    [Fact]
    public async Task AC5_ConcurrentAssignCommunication_ForSameCommunicationType_SecondSaveThrowsAssignmentAlreadyExistsError()
    {
        using var setupScope = _factory.Services.CreateScope();
        var setupDbContext = setupScope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        setupDbContext.Projects.Add(project);
        var user = Domain.Identity.User.Create("Ersteller", $"us039-{Guid.NewGuid():N}@example.com", "correct-horse-battery");
        setupDbContext.Users.Add(user);
        var stakeholder = Stakeholder.Create(
            project.Id, StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, user.Id);
        setupDbContext.Stakeholders.Add(stakeholder);
        var communicationType = CommunicationType.Create($"Statusbericht-{Guid.NewGuid():N}");
        setupDbContext.Add(communicationType);
        await setupDbContext.SaveChangesAsync();

        var stakeholderId = stakeholder.Id;
        var communicationTypeId = communicationType.Id;

        using var scopeA = _factory.Services.CreateScope();
        var repositoryA = scopeA.ServiceProvider.GetRequiredService<IStakeholderRepository>();
        var stakeholderA = await repositoryA.FindByIdAsync(stakeholderId);
        stakeholderA!.AssignCommunication(communicationTypeId, CommunicationFrequency.Weekly, CommunicationChannel.Email);

        using var scopeB = _factory.Services.CreateScope();
        var repositoryB = scopeB.ServiceProvider.GetRequiredService<IStakeholderRepository>();
        var stakeholderB = await repositoryB.FindByIdAsync(stakeholderId);
        stakeholderB!.AssignCommunication(communicationTypeId, CommunicationFrequency.Monthly, CommunicationChannel.Meeting);

        await repositoryA.SaveAsync(stakeholderA);

        var act = async () => await repositoryB.SaveAsync(stakeholderB);
        await act.Should().ThrowAsync<AssignmentAlreadyExistsError>();
    }

    private static Stakeholder CreateStakeholder() =>
        Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid());
}
