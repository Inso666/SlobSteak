using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Stakeholders;

/// <summary>
/// Application Service (US-023): listet die aktiven (nicht soft-gelöschten) Stakeholder eines
/// Projekts — notwendige Standardliste, damit US-023 Akzeptanzkriterium 4 (gelöschte Stakeholder
/// verschwinden aus der Standardliste) prüfbar ist. Die vollständige Liste mit Suche/Filter/
/// Rollen-Sichtbarkeitsregel folgt erst in US-025; dieser Service bleibt bewusst trivial (keine
/// Suche/Filter, kein Vorgriff auf diese Story).
/// </summary>
public sealed class ListStakeholdersService
{
    private readonly IStakeholderRepository _stakeholderRepository;

    public ListStakeholdersService(IStakeholderRepository stakeholderRepository)
    {
        _stakeholderRepository = stakeholderRepository;
    }

    public Task<IReadOnlyList<Stakeholder>> ListActiveStakeholdersAsync(Guid projectId, CancellationToken cancellationToken = default) =>
        _stakeholderRepository.FindActiveByProjectAsync(projectId, cancellationToken);
}
