using SlobSteak.Domain.Communications;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Stakeholders;

/// <summary>Ein Eintrag der Kommunikationszuordnungen eines Stakeholders (US-040), angereichert um
/// den zum Zuordnungszeitpunkt aktuellen Namen/Aktiv-Status des referenzierten
/// <see cref="CommunicationType"/> — die Domain-Entity <see cref="StakeholderCommunicationAssignment"/>
/// selbst kennt (Bounded-Context-Grenze, CLAUDE.md Abschnitt 3.1) nur die
/// <see cref="StakeholderCommunicationAssignment.CommunicationTypeId"/>, keinen Namen.</summary>
public sealed record CommunicationAssignmentItem(
    Guid CommunicationTypeId,
    string CommunicationTypeName,
    bool CommunicationTypeIsActive,
    CommunicationFrequency Frequency,
    CommunicationChannel Channel)
{
    internal static CommunicationAssignmentItem FromAssignment(StakeholderCommunicationAssignment assignment, CommunicationType? communicationType) =>
        new(
            assignment.CommunicationTypeId,
            communicationType?.Name ?? "(unbekannte Kommunikationsart)",
            communicationType?.IsActive ?? false,
            assignment.Frequency,
            assignment.Channel);
}

/// <summary>
/// Application Service (US-040): orchestriert das Zuordnen/Ändern/Entfernen von
/// Kommunikationsarten an einem Stakeholder (Bounded Context StakeholderCommunication). Die
/// eigentlichen Invarianten (höchstens eine Zuordnung je Kommunikationsart, Update/Remove nur auf
/// bestehende Zuordnungen) liegen im <see cref="Stakeholder"/>-Aggregate (US-039); dieser Service
/// löst zusätzlich die Cross-Bounded-Context-Referenz auf den <see cref="CommunicationType"/>-Katalog
/// auf (reine ID-Referenz ohne EF-Navigation, siehe <c>StakeholderCommunicationAssignmentConfiguration</c>)
/// und reichert das Ergebnis um dessen Namen/Aktiv-Status an.
/// </summary>
public sealed class ManageStakeholderCommunicationService
{
    private readonly IStakeholderRepository _stakeholderRepository;
    private readonly ICommunicationTypeRepository _communicationTypeRepository;

    public ManageStakeholderCommunicationService(
        IStakeholderRepository stakeholderRepository,
        ICommunicationTypeRepository communicationTypeRepository)
    {
        _stakeholderRepository = stakeholderRepository;
        _communicationTypeRepository = communicationTypeRepository;
    }

    /// <summary>Liefert die Kommunikationszuordnungen des Stakeholders (Akzeptanzkriterium 5:
    /// Grundlage der Listenanzeige auf der Detailseite), oder <c>null</c>, wenn der Stakeholder
    /// nicht existiert oder soft-gelöscht ist.</summary>
    public async Task<IReadOnlyList<CommunicationAssignmentItem>?> GetAssignmentsAsync(Guid stakeholderId, CancellationToken cancellationToken = default)
    {
        var stakeholder = await _stakeholderRepository.FindByIdAsync(stakeholderId, cancellationToken: cancellationToken);
        if (stakeholder is null)
        {
            return null;
        }

        var items = new List<CommunicationAssignmentItem>();
        foreach (var assignment in stakeholder.CommunicationAssignments)
        {
            var communicationType = await _communicationTypeRepository.FindByIdAsync(assignment.CommunicationTypeId, cancellationToken);
            items.Add(CommunicationAssignmentItem.FromAssignment(assignment, communicationType));
        }

        return items;
    }

    /// <summary>Ordnet dem Stakeholder eine Kommunikationsart zu (Akzeptanzkriterium 1). Liefert
    /// <c>null</c>, wenn der Stakeholder oder die referenzierte Kommunikationsart nicht existiert —
    /// analog zur Cross-Aggregate-Referenzprüfung in
    /// <see cref="Projects.AssignProjectMembershipService.AssignMemberAsync"/> (US-015).</summary>
    /// <exception cref="Domain.Shared.Exceptions.AssignmentAlreadyExistsError">Für die
    /// Kommunikationsart existiert bei diesem Stakeholder bereits eine Zuordnung.</exception>
    public async Task<CommunicationAssignmentItem?> AssignAsync(
        Guid stakeholderId,
        Guid communicationTypeId,
        CommunicationFrequency frequency,
        CommunicationChannel channel,
        CancellationToken cancellationToken = default)
    {
        var stakeholder = await _stakeholderRepository.FindByIdAsync(stakeholderId, cancellationToken: cancellationToken);
        var communicationType = await _communicationTypeRepository.FindByIdAsync(communicationTypeId, cancellationToken);
        if (stakeholder is null || communicationType is null)
        {
            return null;
        }

        stakeholder.AssignCommunication(communicationTypeId, frequency, channel);
        await _stakeholderRepository.SaveAsync(stakeholder, cancellationToken);

        return new CommunicationAssignmentItem(communicationTypeId, communicationType.Name, communicationType.IsActive, frequency, channel);
    }

    /// <summary>Aktualisiert Frequenz/Kanal einer bestehenden Zuordnung (Akzeptanzkriterium 2).
    /// Liefert <c>null</c>, wenn der Stakeholder nicht existiert.</summary>
    /// <exception cref="Domain.Shared.Exceptions.AssignmentNotFoundError">Für die
    /// Kommunikationsart existiert bei diesem Stakeholder keine Zuordnung.</exception>
    public async Task<CommunicationAssignmentItem?> UpdateAsync(
        Guid stakeholderId,
        Guid communicationTypeId,
        CommunicationFrequency frequency,
        CommunicationChannel channel,
        CancellationToken cancellationToken = default)
    {
        var stakeholder = await _stakeholderRepository.FindByIdAsync(stakeholderId, cancellationToken: cancellationToken);
        if (stakeholder is null)
        {
            return null;
        }

        stakeholder.UpdateCommunicationAssignment(communicationTypeId, frequency, channel);
        await _stakeholderRepository.SaveAsync(stakeholder, cancellationToken);

        var communicationType = await _communicationTypeRepository.FindByIdAsync(communicationTypeId, cancellationToken);
        return CommunicationAssignmentItem.FromAssignment(
            new StakeholderCommunicationAssignment(Guid.NewGuid(), stakeholderId, communicationTypeId, frequency, channel),
            communicationType);
    }

    /// <summary>Entfernt eine Zuordnung (Akzeptanzkriterium 3). Idempotent, analog zu
    /// <see cref="Stakeholder.RemoveCommunicationAssignment"/> — existiert keine Zuordnung, passiert
    /// nichts. Liefert <c>false</c>, wenn der Stakeholder selbst nicht existiert.</summary>
    public async Task<bool> RemoveAsync(Guid stakeholderId, Guid communicationTypeId, CancellationToken cancellationToken = default)
    {
        var stakeholder = await _stakeholderRepository.FindByIdAsync(stakeholderId, cancellationToken: cancellationToken);
        if (stakeholder is null)
        {
            return false;
        }

        stakeholder.RemoveCommunicationAssignment(communicationTypeId);
        await _stakeholderRepository.SaveAsync(stakeholder, cancellationToken);
        return true;
    }
}
