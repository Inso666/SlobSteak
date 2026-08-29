using SlobSteak.Domain.Assessments;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Map;

/// <summary>
/// Application Service (US-033): liefert das Read-Modell für den Vergleichsmodus der
/// Stakeholder-Map — je Stakeholder mit Assessment in mindestens einer der beiden gewählten
/// Perspektiven <paramref name="primary"/>/<paramref name="secondary"/> ein Eintrag mit den
/// jeweils optionalen Werten (Bounded Context StakeholderMap, PRD F3.2). Orchestriert wie
/// <see cref="StakeholderMapQuery"/> (US-031) die beiden Aggregate <see cref="Stakeholder"/>
/// (StakeholderManagement) und <see cref="StakeholderAssessment"/> (StakeholderAssessment) über
/// deren jeweilige Repository-Schnittstellen, ohne direkte EF-Core-Joins über Aggregate-Grenzen
/// hinweg (CLAUDE.md/backend.md Abschnitt 1).
/// </summary>
public sealed class StakeholderMapComparisonQuery
{
    private readonly IStakeholderRepository _stakeholderRepository;
    private readonly IStakeholderAssessmentRepository _assessmentRepository;

    public StakeholderMapComparisonQuery(
        IStakeholderRepository stakeholderRepository,
        IStakeholderAssessmentRepository assessmentRepository)
    {
        _stakeholderRepository = stakeholderRepository;
        _assessmentRepository = assessmentRepository;
    }

    /// <summary>Liefert je aktivem Stakeholder mit Assessment in <paramref name="primary"/> und/oder
    /// <paramref name="secondary"/> genau einen <see cref="StakeholderMapComparisonEntry"/>.
    /// Stakeholder ganz ohne Assessment in beiden Perspektiven sowie soft-gelöschte Stakeholder
    /// sind nicht enthalten (Akzeptanzkriterium 1/3). Die Gleichheitsprüfung
    /// <paramref name="primary"/> == <paramref name="secondary"/> (Akzeptanzkriterium 2) ist
    /// Sache des Aufrufers (Api-Schicht, analog zur bestehenden Validierung in
    /// <see cref="StakeholderMapQuery"/>), nicht dieser Query.</summary>
    public async Task<IReadOnlyList<StakeholderMapComparisonEntry>> GetForProjectAsync(
        Guid projectId, ProjectRole primary, ProjectRole secondary, CancellationToken cancellationToken = default)
    {
        var activeStakeholders = await _stakeholderRepository.FindActiveByProjectAsync(projectId, cancellationToken);

        var entries = new List<StakeholderMapComparisonEntry>();
        foreach (var stakeholder in activeStakeholders)
        {
            var primaryAssessment = await _assessmentRepository.FindByStakeholderAndRoleAsync(stakeholder.Id, primary, cancellationToken);
            var secondaryAssessment = await _assessmentRepository.FindByStakeholderAndRoleAsync(stakeholder.Id, secondary, cancellationToken);

            if (primaryAssessment is null && secondaryAssessment is null)
            {
                continue;
            }

            var primaryValue = primaryAssessment is null
                ? null
                : new StakeholderMapComparisonValue(primaryAssessment.Influence, primaryAssessment.Interest);
            var secondaryValue = secondaryAssessment is null
                ? null
                : new StakeholderMapComparisonValue(secondaryAssessment.Influence, secondaryAssessment.Interest);

            entries.Add(new StakeholderMapComparisonEntry(stakeholder.Id, stakeholder.Name, primaryValue, secondaryValue));
        }

        return entries;
    }
}
