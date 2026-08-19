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
/// </summary>
public sealed class ListStakeholdersService
{
    private readonly IStakeholderListQuery _stakeholderListQuery;
    private readonly IUserRepository _userRepository;

    public ListStakeholdersService(IStakeholderListQuery stakeholderListQuery, IUserRepository userRepository)
    {
        _stakeholderListQuery = stakeholderListQuery;
        _userRepository = userRepository;
    }

    /// <param name="search">Case-insensitiver Teilstring-Match über Name/Organisation (US-025
    /// Akzeptanzkriterium 2); <c>null</c>/leer = kein Filter.</param>
    /// <param name="type">Optionaler Typ-Filter.</param>
    /// <param name="communicationTypeId">Optionaler Filter auf zugeordnete Kommunikationsart.</param>
    public async Task<IReadOnlyList<StakeholderListItem>> ListActiveStakeholdersAsync(
        Guid projectId,
        string? search = null,
        StakeholderType? type = null,
        Guid? communicationTypeId = null,
        CancellationToken cancellationToken = default)
    {
        var stakeholders = await _stakeholderListQuery.SearchActiveByProjectAsync(
            projectId, search, type, communicationTypeId, cancellationToken);

        var items = new List<StakeholderListItem>();
        foreach (var stakeholder in stakeholders)
        {
            var updater = await _userRepository.FindByIdAsync(stakeholder.UpdatedBy, cancellationToken);
            items.Add(new StakeholderListItem(stakeholder, updater?.Name ?? "(unbekannter Nutzer)"));
        }

        return items;
    }
}
