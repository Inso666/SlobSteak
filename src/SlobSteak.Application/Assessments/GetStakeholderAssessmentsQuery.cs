using SlobSteak.Domain.Assessments;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Assessments;

/// <summary>
/// Application Service (US-028): liefert die Assessment-Übersicht eines Stakeholders — je
/// perspektiv-tragender Rolle (<c>PL</c>/<c>Coreteam</c>/<c>Architect</c>) genau einen Eintrag,
/// auch wenn (noch) kein Assessment existiert (Akzeptanzkriterium 5/6). Die Sichtbarkeitsregel für
/// Rolle <c>User</c> (F2.3 — Einfluss-/Interesse-Werte ausblenden) ist ausdrücklich noch nicht
/// Teil dieser Story, siehe US-030.
/// </summary>
public sealed class GetStakeholderAssessmentsQuery
{
    private static readonly ProjectRole[] PerspectiveBearingRoles =
    {
        ProjectRole.PL,
        ProjectRole.Coreteam,
        ProjectRole.Architect,
    };

    private readonly IStakeholderRepository _stakeholderRepository;
    private readonly IStakeholderAssessmentRepository _assessmentRepository;
    private readonly IProjectRepository _projectRepository;
    private readonly IUserRepository _userRepository;

    public GetStakeholderAssessmentsQuery(
        IStakeholderRepository stakeholderRepository,
        IStakeholderAssessmentRepository assessmentRepository,
        IProjectRepository projectRepository,
        IUserRepository userRepository)
    {
        _stakeholderRepository = stakeholderRepository;
        _assessmentRepository = assessmentRepository;
        _projectRepository = projectRepository;
        _userRepository = userRepository;
    }

    /// <summary>Liefert <c>null</c>, wenn der Stakeholder nicht existiert oder soft-gelöscht ist.</summary>
    public async Task<IReadOnlyList<AssessmentRoleItem>?> GetForStakeholderAsync(Guid stakeholderId, CancellationToken cancellationToken = default)
    {
        var stakeholder = await _stakeholderRepository.FindByIdAsync(stakeholderId, cancellationToken: cancellationToken);
        if (stakeholder is null)
        {
            return null;
        }

        var project = await _projectRepository.FindByIdAsync(stakeholder.ProjectId, cancellationToken);
        var assignedRoles = project is null
            ? new HashSet<ProjectRole>()
            : project.Memberships.Select(m => m.Role).ToHashSet();

        var assessments = await _assessmentRepository.FindAllByStakeholderAsync(stakeholderId, cancellationToken);
        var assessmentsByRole = assessments.ToDictionary(a => a.Role);

        var items = new List<AssessmentRoleItem>();
        foreach (var role in PerspectiveBearingRoles)
        {
            if (assessmentsByRole.TryGetValue(role, out var assessment))
            {
                var updater = await _userRepository.FindByIdAsync(assessment.UpdatedBy, cancellationToken);
                items.Add(new AssessmentRoleItem(role, AssessmentRoleStatus.Assessed, assessment, updater?.Name ?? "(unbekannter Nutzer)"));
            }
            else if (assignedRoles.Contains(role))
            {
                items.Add(new AssessmentRoleItem(role, AssessmentRoleStatus.NotAssessed, null, null));
            }
            else
            {
                items.Add(new AssessmentRoleItem(role, AssessmentRoleStatus.NoRoleAssigned, null, null));
            }
        }

        return items;
    }
}
