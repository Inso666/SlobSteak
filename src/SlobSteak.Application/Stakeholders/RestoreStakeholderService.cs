using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Stakeholders;

/// <summary>
/// Application Service (US-024): macht ein zuvor gesetztes Soft-Delete rückgängig. Orchestriert
/// nur den Use Case — die eigentliche Idempotenz-Regel liegt im <see cref="Stakeholder"/>-Aggregate
/// (<see cref="Stakeholder.Restore"/>, bereits seit US-020 vorhanden).
/// </summary>
public sealed class RestoreStakeholderService
{
    private readonly IStakeholderRepository _stakeholderRepository;

    public RestoreStakeholderService(IStakeholderRepository stakeholderRepository)
    {
        _stakeholderRepository = stakeholderRepository;
    }

    /// <summary>Liefert <c>false</c>, wenn der Stakeholder nicht existiert — <c>true</c> sowohl für
    /// einen frisch wiederhergestellten als auch für einen bereits aktiven Stakeholder (idempotent,
    /// analog zu <see cref="SoftDeleteStakeholderService.SoftDeleteAsync"/>, Akzeptanzkriterium 2).</summary>
    public async Task<bool> RestoreAsync(Guid stakeholderId, CancellationToken cancellationToken = default)
    {
        var stakeholder = await _stakeholderRepository.FindByIdAsync(stakeholderId, includeDeleted: true, cancellationToken);
        if (stakeholder is null)
        {
            return false;
        }

        stakeholder.Restore();
        await _stakeholderRepository.SaveAsync(stakeholder, cancellationToken);
        return true;
    }
}
