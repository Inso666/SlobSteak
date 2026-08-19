using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Stakeholders;

/// <summary>
/// Application Service (US-024): listet die soft-gelöschten Stakeholder eines Projekts für die
/// Papierkorb-Ansicht, inklusive aufgelöstem <see cref="DeletedStakeholderItem.DeletedByName"/>/
/// <see cref="DeletedStakeholderItem.UpdatedByName"/> (analog zu <see cref="ListStakeholdersService"/>,
/// US-025). Nutzt bewusst direkt <see cref="IStakeholderRepository.FindDeletedByProjectAsync"/>
/// statt eines eigenen Domain-/Infrastructure-Read-Modell-Ports (wie <see cref="IStakeholderListQuery"/>)
/// — die Abfrage ist ein einfacher Filter ohne zusätzliche Such-/Join-Logik, den das bereits
/// bestehende Repository-Interface vollständig abdeckt.
/// </summary>
public sealed class DeletedStakeholdersQuery
{
    private readonly IStakeholderRepository _stakeholderRepository;
    private readonly IUserRepository _userRepository;

    public DeletedStakeholdersQuery(IStakeholderRepository stakeholderRepository, IUserRepository userRepository)
    {
        _stakeholderRepository = stakeholderRepository;
        _userRepository = userRepository;
    }

    /// <summary>Liefert alle soft-gelöschten Stakeholder des Projekts (Akzeptanzkriterium 1).</summary>
    public async Task<IReadOnlyList<DeletedStakeholderItem>> ListDeletedStakeholdersAsync(
        Guid projectId, CancellationToken cancellationToken = default)
    {
        var stakeholders = await _stakeholderRepository.FindDeletedByProjectAsync(projectId, cancellationToken);

        var items = new List<DeletedStakeholderItem>();
        foreach (var stakeholder in stakeholders)
        {
            var updater = await _userRepository.FindByIdAsync(stakeholder.UpdatedBy, cancellationToken);
            var deleter = stakeholder.DeletedBy is null
                ? null
                : await _userRepository.FindByIdAsync(stakeholder.DeletedBy.Value, cancellationToken);

            items.Add(new DeletedStakeholderItem(
                stakeholder,
                updater?.Name ?? "(unbekannter Nutzer)",
                deleter?.Name ?? "(unbekannter Nutzer)"));
        }

        return items;
    }
}
