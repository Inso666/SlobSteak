using SlobSteak.Domain.Assessments;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Projects;

/// <summary>
/// Application Service (US-076): liefert je perspektiv-tragender Rolle (<c>PL</c>/<c>Coreteam</c>/
/// <c>Architect</c>) den gerundeten Anteil aktiver Stakeholder eines Projekts, für die diese Rolle
/// bereits ein Assessment abgegeben hat — Grundlage der drei Fortschritts-Ringe sowie des
/// „unbewertet · deine Sicht"-Hinweises auf der Projektübersicht (Akzeptanzkriterium 2/4/5).
/// Orchestriert das <see cref="Stakeholder"/>-Aggregate (StakeholderManagement) und das
/// <see cref="StakeholderAssessment"/>-Aggregate (StakeholderAssessment) über deren jeweilige
/// Repository-Schnittstellen — analog zu <see cref="Map.StakeholderMapQuery"/> (US-031) bzw.
/// <see cref="DistributionLists.DistributionListQuery"/> (US-041), ohne direkte EF-Core-Joins über
/// Aggregate-Grenzen hinweg (CLAUDE.md/backend.md Abschnitt 1).
/// </summary>
public sealed class ProjectAssessmentProgressQuery
{
    private static readonly ProjectRole[] PerspectiveBearingRoles =
    {
        ProjectRole.PL,
        ProjectRole.Coreteam,
        ProjectRole.Architect,
    };

    private readonly IStakeholderRepository _stakeholderRepository;
    private readonly IStakeholderAssessmentRepository _assessmentRepository;

    public ProjectAssessmentProgressQuery(
        IStakeholderRepository stakeholderRepository,
        IStakeholderAssessmentRepository assessmentRepository)
    {
        _stakeholderRepository = stakeholderRepository;
        _assessmentRepository = assessmentRepository;
    }

    /// <summary>Berechnet den Bewertungsfortschritt für <paramref name="projectId"/>. Bezieht sich
    /// ausschließlich auf aktive (nicht soft-gelöschte) Stakeholder (PRD Abschnitt 4.3 Punkt 5,
    /// Story-Datei „Wichtige Invarianten"). Hat das Projekt keine aktiven Stakeholder, ist
    /// <see cref="RoleAssessmentProgress.Percent"/> für alle drei Rollen <c>0</c> statt einer
    /// Division durch 0 (Akzeptanzkriterium 8, Randfall).</summary>
    public async Task<ProjectAssessmentProgress> GetForProjectAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        var activeStakeholders = await _stakeholderRepository.FindActiveByProjectAsync(projectId, cancellationToken);
        var activeCount = activeStakeholders.Count;

        var assessedCountByRole = PerspectiveBearingRoles.ToDictionary(role => role, _ => 0);
        foreach (var stakeholder in activeStakeholders)
        {
            var assessments = await _assessmentRepository.FindAllByStakeholderAsync(stakeholder.Id, cancellationToken);
            foreach (var assessment in assessments)
            {
                if (assessedCountByRole.ContainsKey(assessment.Role))
                {
                    assessedCountByRole[assessment.Role]++;
                }
            }
        }

        return new ProjectAssessmentProgress(
            projectId,
            BuildProgress(activeCount, assessedCountByRole[ProjectRole.PL]),
            BuildProgress(activeCount, assessedCountByRole[ProjectRole.Coreteam]),
            BuildProgress(activeCount, assessedCountByRole[ProjectRole.Architect]));
    }

    private static RoleAssessmentProgress BuildProgress(int activeCount, int assessedCount)
    {
        var percent = activeCount == 0 ? 0 : (int)Math.Round(100.0 * assessedCount / activeCount, MidpointRounding.AwayFromZero);
        var unassessedCount = activeCount - assessedCount;
        return new RoleAssessmentProgress(percent, unassessedCount);
    }
}
