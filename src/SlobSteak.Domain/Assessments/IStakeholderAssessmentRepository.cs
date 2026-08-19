using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Domain.Assessments;

/// <summary>
/// Repository-Abstraktion für das <see cref="StakeholderAssessment"/>-Aggregate (Bounded Context
/// StakeholderAssessment). Persistenzdetails liegen ausschließlich in der Infrastructure-
/// Implementierung (CLAUDE.md Abschnitt 3.1). Methodennamen tragen — analog zu allen anderen
/// Repository-Interfaces (z. B. <see cref="Stakeholders.IStakeholderRepository"/>) — konsequent
/// das <c>Async</c>-Suffix, abweichend von der in der Story-Datei genannten Kurzform.
/// </summary>
public interface IStakeholderAssessmentRepository
{
    /// <summary>Lädt das Assessment für die eindeutige (<paramref name="stakeholderId"/>,
    /// <paramref name="role"/>)-Kombination, falls vorhanden (Akzeptanzkriterium 5).</summary>
    Task<StakeholderAssessment?> FindByStakeholderAndRoleAsync(
        Guid stakeholderId, ProjectRole role, CancellationToken cancellationToken = default);

    /// <summary>Liefert alle Assessments eines Stakeholders, je perspektiv-tragender Rolle
    /// höchstens eines (Akzeptanzkriterium 5).</summary>
    Task<IReadOnlyList<StakeholderAssessment>> FindAllByStakeholderAsync(
        Guid stakeholderId, CancellationToken cancellationToken = default);

    Task SaveAsync(StakeholderAssessment assessment, CancellationToken cancellationToken = default);
}
