using SlobSteak.Domain.Assessments;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Map;

/// <summary>
/// Application Service (US-031): liefert das Read-Modell für die Stakeholder-Map einer gewählten
/// Perspektive (Bounded Context StakeholderMap, PRD F3.1) — ausschließlich aktive Stakeholder
/// (<c>deleted_at IS NULL</c>, PRD Abschnitt 4.3 Punkt 5), die in dieser Perspektive ein Assessment
/// besitzen (Akzeptanzkriterium 1/2). Orchestriert die beiden Aggregate <see cref="Stakeholder"/>
/// (StakeholderManagement) und <see cref="StakeholderAssessment"/> (StakeholderAssessment) über
/// deren jeweilige Repository-Schnittstellen — analog zu
/// <see cref="Assessments.GetStakeholderAssessmentsQuery"/> (US-028), ohne direkte EF-Core-Joins
/// über Aggregate-Grenzen hinweg (CLAUDE.md/backend.md Abschnitt 1).
/// </summary>
public sealed class StakeholderMapQuery
{
    private readonly IStakeholderRepository _stakeholderRepository;
    private readonly IStakeholderAssessmentRepository _assessmentRepository;

    public StakeholderMapQuery(
        IStakeholderRepository stakeholderRepository,
        IStakeholderAssessmentRepository assessmentRepository)
    {
        _stakeholderRepository = stakeholderRepository;
        _assessmentRepository = assessmentRepository;
    }

    /// <summary>Liefert je aktivem Stakeholder mit Assessment in <paramref name="perspective"/>
    /// genau einen <see cref="StakeholderMapEntry"/>. Stakeholder ohne Assessment in dieser
    /// Perspektive sowie soft-gelöschte Stakeholder sind nicht enthalten (Akzeptanzkriterium 1/2).
    /// </summary>
    public async Task<IReadOnlyList<StakeholderMapEntry>> GetForProjectAsync(
        Guid projectId, ProjectRole perspective, CancellationToken cancellationToken = default)
    {
        var activeStakeholders = await _stakeholderRepository.FindActiveByProjectAsync(projectId, cancellationToken);

        var entries = new List<StakeholderMapEntry>();
        foreach (var stakeholder in activeStakeholders)
        {
            var assessment = await _assessmentRepository.FindByStakeholderAndRoleAsync(stakeholder.Id, perspective, cancellationToken);
            if (assessment is null)
            {
                continue;
            }

            entries.Add(new StakeholderMapEntry(stakeholder.Id, stakeholder.Name, assessment.Influence, assessment.Interest));
        }

        return entries;
    }
}
