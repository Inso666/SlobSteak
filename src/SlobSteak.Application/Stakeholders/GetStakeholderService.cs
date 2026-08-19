using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Stakeholders;

/// <summary>
/// Application Service (US-026): lädt einen einzelnen Stakeholder für die Detailseite (Screen S4),
/// inklusive aufgelöstem <see cref="StakeholderListItem.UpdatedByName"/> (analog zu
/// <see cref="ListStakeholdersService"/>). Liefert bewusst über
/// <see cref="IStakeholderRepository.FindByIdAsync"/> mit <c>includeDeleted: false</c> — ein
/// soft-gelöschter Stakeholder gilt für diese Ansicht als nicht existent (Akzeptanzkriterium 5),
/// konsistent mit <see cref="UpdateStakeholderDetailsService"/> (US-022).
/// </summary>
public sealed class GetStakeholderService
{
    private readonly IStakeholderRepository _stakeholderRepository;
    private readonly IUserRepository _userRepository;

    public GetStakeholderService(IStakeholderRepository stakeholderRepository, IUserRepository userRepository)
    {
        _stakeholderRepository = stakeholderRepository;
        _userRepository = userRepository;
    }

    /// <summary>Liefert <c>null</c>, wenn der Stakeholder nicht existiert oder soft-gelöscht ist
    /// (Akzeptanzkriterium 5: „Nicht gefunden“-Ansicht).</summary>
    public async Task<StakeholderListItem?> GetByIdAsync(Guid stakeholderId, CancellationToken cancellationToken = default)
    {
        var stakeholder = await _stakeholderRepository.FindByIdAsync(stakeholderId, includeDeleted: false, cancellationToken);
        if (stakeholder is null)
        {
            return null;
        }

        var updater = await _userRepository.FindByIdAsync(stakeholder.UpdatedBy, cancellationToken);
        return new StakeholderListItem(stakeholder, updater?.Name ?? "(unbekannter Nutzer)");
    }
}
