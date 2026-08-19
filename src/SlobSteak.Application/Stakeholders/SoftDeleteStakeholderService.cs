using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Stakeholders;

/// <summary>
/// Application Service (US-023): markiert einen Stakeholder als gelöscht (Soft-Delete) und liefert
/// die Anzahl betroffener Assessments/Kommunikationszuordnungen für den Bestätigungsdialog.
/// Orchestriert nur den Use Case — die eigentliche Idempotenz-Regel liegt im
/// <see cref="Stakeholder"/>-Aggregate (<see cref="Stakeholder.SoftDelete"/>, US-020).
/// </summary>
public sealed class SoftDeleteStakeholderService
{
    private readonly IStakeholderRepository _stakeholderRepository;

    public SoftDeleteStakeholderService(IStakeholderRepository stakeholderRepository)
    {
        _stakeholderRepository = stakeholderRepository;
    }

    /// <summary>Liefert <c>false</c>, wenn der Stakeholder nicht existiert (auch nicht als bereits
    /// gelöschter) — <c>true</c> sowohl für einen frisch gelöschten als auch für einen bereits
    /// zuvor gelöschten Stakeholder (US-023 Akzeptanzkriterium 5: idempotent, kein Fehler, kein
    /// erneutes Setzen von <c>deleted_at</c>).</summary>
    public async Task<bool> SoftDeleteAsync(Guid stakeholderId, Guid deletedBy, CancellationToken cancellationToken = default)
    {
        var stakeholder = await _stakeholderRepository.FindByIdAsync(stakeholderId, includeDeleted: true, cancellationToken);
        if (stakeholder is null)
        {
            return false;
        }

        stakeholder.SoftDelete(deletedBy);
        await _stakeholderRepository.SaveAsync(stakeholder, cancellationToken);
        return true;
    }

    /// <summary>Liefert <c>null</c>, wenn der Stakeholder nicht existiert (US-023 Akzeptanzkriterium 2:
    /// Impact-Zahlen für den Bestätigungsdialog vor dem eigentlichen Löschen).</summary>
    public async Task<StakeholderDeletionImpact?> GetDeletionImpactAsync(Guid stakeholderId, CancellationToken cancellationToken = default)
    {
        var stakeholder = await _stakeholderRepository.FindByIdAsync(stakeholderId, includeDeleted: true, cancellationToken);
        if (stakeholder is null)
        {
            return null;
        }

        return await _stakeholderRepository.GetDeletionImpactAsync(stakeholderId, cancellationToken);
    }
}
