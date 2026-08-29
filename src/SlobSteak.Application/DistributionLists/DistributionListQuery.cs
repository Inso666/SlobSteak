using SlobSteak.Domain.Communications;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.DistributionLists;

/// <summary>
/// Application Service (US-041): liefert das Read-Modell für die Verteilerliste eines Projekts
/// (Bounded Context DistributionList, PRD F4.1) — gefiltert nach Kommunikationsart, Frequenz, Kanal
/// und/oder Stakeholder-Typ (beliebige Kombination, alle optional). Orchestriert das
/// <see cref="Stakeholder"/>-Aggregate (inkl. dessen <see cref="Stakeholder.CommunicationAssignments"/>,
/// Bounded Context StakeholderManagement) und den <see cref="CommunicationType"/>-Katalog (Bounded
/// Context CommunicationCatalog) über deren jeweilige Repository-Schnittstellen — analog zu
/// <see cref="Map.StakeholderMapQuery"/> (US-031) bzw. <see cref="Stakeholders.ManageStakeholderCommunicationService"/>
/// (US-040), ohne direkte EF-Core-Joins über Aggregate-/Bounded-Context-Grenzen hinweg (CLAUDE.md/
/// backend.md Abschnitt 1). Bewusst keine eigene Infrastructure-seitige EF-Core-Query nötig: die
/// vorhandenen Repositories (inkl. der von <see cref="IStakeholderRepository.FindActiveByProjectAsync"/>
/// mitgeladenen Kommunikationszuordnungen, siehe dessen XML-Doc) reichen für dieses Read-Modell aus
/// (siehe „Anmerkungen des Agenten“, Story-Datei US-041).
/// </summary>
public sealed class DistributionListQuery
{
    private readonly IStakeholderRepository _stakeholderRepository;
    private readonly ICommunicationTypeRepository _communicationTypeRepository;

    public DistributionListQuery(IStakeholderRepository stakeholderRepository, ICommunicationTypeRepository communicationTypeRepository)
    {
        _stakeholderRepository = stakeholderRepository;
        _communicationTypeRepository = communicationTypeRepository;
    }

    /// <summary>Liefert je aktivem Stakeholder und passender Kommunikationszuordnung genau einen
    /// <see cref="DistributionListEntry"/> (Akzeptanzkriterium 1). Soft-gelöschte Stakeholder sind
    /// nie enthalten (Akzeptanzkriterium 3, PRD Abschnitt 4.3 Punkt 5). Ein Stakeholder ohne (zum
    /// Filter passende) Kommunikationszuordnung erzeugt keinen Eintrag; ein Stakeholder ohne
    /// hinterlegte E-Mail-Adresse bleibt enthalten, mit <see cref="DistributionListEntry.HasEmail"/>
    /// <c>= false</c> (Akzeptanzkriterium 4). Kein Filterkriterium gesetzt → alle
    /// Kommunikationszuordnungen aller aktiven Stakeholder. Kein Treffer → leere Liste
    /// (Akzeptanzkriterium 5).</summary>
    /// <param name="communicationTypeId">Optionaler Filter auf eine konkrete Kommunikationsart.</param>
    /// <param name="frequency">Optionaler Filter auf die Frequenz der Zuordnung.</param>
    /// <param name="channel">Optionaler Filter auf den Kanal der Zuordnung.</param>
    /// <param name="stakeholderType">Optionaler Filter auf den Stakeholder-Typ.</param>
    public async Task<IReadOnlyList<DistributionListEntry>> GetForProjectAsync(
        Guid projectId,
        Guid? communicationTypeId,
        CommunicationFrequency? frequency,
        CommunicationChannel? channel,
        StakeholderType? stakeholderType,
        CancellationToken cancellationToken = default)
    {
        var activeStakeholders = await _stakeholderRepository.FindActiveByProjectAsync(projectId, cancellationToken);

        // Katalog einmalig komplett laden (inkl. deaktivierter Einträge, analog zu
        // CommunicationAssignmentItem.FromAssignment/US-040) statt je Zuordnung einzeln
        // nachzuschlagen — bei der überschaubaren Katalog-/Projektgröße dieser Instanz unkritisch,
        // vermeidet aber unnötige N+1-Lookups gegenüber dem Muster in
        // ManageStakeholderCommunicationService.
        var communicationTypesById = (await _communicationTypeRepository.FindAllAsync(activeOnly: false, cancellationToken))
            .ToDictionary(c => c.Id);

        var entries = new List<DistributionListEntry>();
        foreach (var stakeholder in activeStakeholders)
        {
            if (stakeholderType is not null && stakeholder.Type != stakeholderType)
            {
                continue;
            }

            foreach (var assignment in stakeholder.CommunicationAssignments)
            {
                if (communicationTypeId is not null && assignment.CommunicationTypeId != communicationTypeId)
                {
                    continue;
                }

                if (frequency is not null && assignment.Frequency != frequency)
                {
                    continue;
                }

                if (channel is not null && assignment.Channel != channel)
                {
                    continue;
                }

                communicationTypesById.TryGetValue(assignment.CommunicationTypeId, out var communicationType);

                entries.Add(new DistributionListEntry(
                    stakeholder.Id,
                    stakeholder.Name,
                    stakeholder.Type,
                    stakeholder.Email is not null,
                    stakeholder.Email?.Value,
                    assignment.CommunicationTypeId,
                    communicationType?.Name ?? "(unbekannte Kommunikationsart)",
                    assignment.Frequency,
                    assignment.Channel));
            }
        }

        return entries;
    }
}
