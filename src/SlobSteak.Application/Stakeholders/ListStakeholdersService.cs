using SlobSteak.Domain.Communications;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Stakeholders;

/// <summary>
/// Application Service (US-023, erweitert um Suche/Filter in US-025): listet die aktiven (nicht
/// soft-gelöschten) Stakeholder eines Projekts, optional durchsuchbar/filterbar, inklusive
/// aufgelöstem Namen des jeweils zuletzt ändernden Nutzers (analog zu
/// <see cref="CreateStakeholderService"/>/<see cref="UpdateStakeholderDetailsService"/> — ein
/// einheitlicher Response-Contract erlaubt es dem Frontend, dieselben Bearbeiten-/
/// Löschen-Komponenten unabhängig vom Einstiegspunkt zu verwenden). Orchestriert nur den Use
/// Case — die eigentliche Such-/Filterlogik liegt im Read-Modell <see cref="IStakeholderListQuery"/>
/// (US-025).
///
/// US-072 (additiv): reichert jeden Eintrag zusätzlich um
/// <see cref="StakeholderListItem.CommunicationTypeNames"/> an — löst dafür analog zu
/// <see cref="DistributionLists.DistributionListQuery"/> die Cross-Bounded-Context-Referenz auf
/// den <see cref="CommunicationType"/>-Katalog auf, aber ausschließlich für die perspektiv-
/// tragenden Rollen <c>PL</c>/<c>Coreteam</c>/<c>Architect</c> (<paramref name="callerRole"/>) —
/// dieselbe Sichtbarkeitsgrenze wie <see cref="ManageStakeholderCommunicationService"/> (US-040).
/// Für Rolle <c>User</c> bleibt das Feld je Eintrag ein leeres Array, ohne den
/// <see cref="ICommunicationTypeRepository"/> überhaupt aufzurufen.
/// </summary>
public sealed class ListStakeholdersService
{
    /// <summary>Rollen, für die <see cref="StakeholderListItem.CommunicationTypeNames"/> befüllt
    /// wird (US-072 Akzeptanzkriterium 6, identische Grenze wie US-040).</summary>
    private static readonly ProjectRole[] CommunicationVisibleRoles =
        { ProjectRole.PL, ProjectRole.Coreteam, ProjectRole.Architect };

    private readonly IStakeholderListQuery _stakeholderListQuery;
    private readonly IUserRepository _userRepository;
    private readonly ICommunicationTypeRepository _communicationTypeRepository;

    public ListStakeholdersService(
        IStakeholderListQuery stakeholderListQuery,
        IUserRepository userRepository,
        ICommunicationTypeRepository communicationTypeRepository)
    {
        _stakeholderListQuery = stakeholderListQuery;
        _userRepository = userRepository;
        _communicationTypeRepository = communicationTypeRepository;
    }

    /// <param name="projectId">Das Projekt, dessen aktive Stakeholder gelistet werden.</param>
    /// <param name="callerRole">Projektrolle des aufrufenden Nutzers — bestimmt, ob
    /// <see cref="StakeholderListItem.CommunicationTypeNames"/> befüllt wird (US-072).</param>
    /// <param name="search">Case-insensitiver Teilstring-Match über Name/Organisation (US-025
    /// Akzeptanzkriterium 2); <c>null</c>/leer = kein Filter.</param>
    /// <param name="type">Optionaler Typ-Filter.</param>
    /// <param name="communicationTypeId">Optionaler Filter auf zugeordnete Kommunikationsart.</param>
    public async Task<IReadOnlyList<StakeholderListItem>> ListActiveStakeholdersAsync(
        Guid projectId,
        ProjectRole callerRole,
        string? search = null,
        StakeholderType? type = null,
        Guid? communicationTypeId = null,
        CancellationToken cancellationToken = default)
    {
        var stakeholders = await _stakeholderListQuery.SearchActiveByProjectAsync(
            projectId, search, type, communicationTypeId, cancellationToken);

        var includeCommunicationTypeNames = CommunicationVisibleRoles.Contains(callerRole);

        // Katalog nur laden, wenn die Rolle die Kommunikations-Spalte überhaupt sehen darf —
        // Rolle `User` löst so keinen zusätzlichen Repository-Aufruf aus (Akzeptanzkriterium 6).
        var communicationTypeNamesById = includeCommunicationTypeNames
            ? (await _communicationTypeRepository.FindAllAsync(activeOnly: false, cancellationToken))
                .ToDictionary(c => c.Id, c => c.Name)
            : new Dictionary<Guid, string>();

        var items = new List<StakeholderListItem>();
        foreach (var stakeholder in stakeholders)
        {
            var updater = await _userRepository.FindByIdAsync(stakeholder.UpdatedBy, cancellationToken);

            IReadOnlyList<string> communicationTypeNames = includeCommunicationTypeNames
                ? stakeholder.CommunicationAssignments
                    .Select(a => communicationTypeNamesById.TryGetValue(a.CommunicationTypeId, out var name)
                        ? name
                        : "(unbekannte Kommunikationsart)")
                    .ToList()
                : Array.Empty<string>();

            items.Add(new StakeholderListItem(stakeholder, updater?.Name ?? "(unbekannter Nutzer)", communicationTypeNames));
        }

        return items;
    }
}
