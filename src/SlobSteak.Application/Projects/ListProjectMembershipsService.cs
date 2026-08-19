using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Projects;

namespace SlobSteak.Application.Projects;

/// <summary>
/// Application Service (US-017): listet die Mitgliedschaften eines Projekts inklusive Name/E-Mail
/// des jeweiligen Nutzers, für die Mitgliederverwaltung im Admin-Bereich (Akzeptanzkriterium 3/4).
/// Orchestriert die Zusammenführung von <see cref="Project.Memberships"/> (ProjectManagement
/// Context) mit <see cref="IUserRepository"/> (IdentityAccess Context) — ausschließlich über die
/// rohe <c>UserId</c>, keine Cross-Context-Navigation (CLAUDE.md Abschnitt 3.1).
/// </summary>
public sealed class ListProjectMembershipsService
{
    private readonly IProjectRepository _projectRepository;
    private readonly IUserRepository _userRepository;

    public ListProjectMembershipsService(IProjectRepository projectRepository, IUserRepository userRepository)
    {
        _projectRepository = projectRepository;
        _userRepository = userRepository;
    }

    /// <summary>Liefert <c>null</c>, wenn <paramref name="projectId"/> nicht existiert.</summary>
    public async Task<IReadOnlyList<ProjectMembershipDetail>?> ListMembershipsAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        var project = await _projectRepository.FindByIdAsync(projectId, cancellationToken);
        if (project is null)
        {
            return null;
        }

        var details = new List<ProjectMembershipDetail>();
        foreach (var membership in project.Memberships)
        {
            var user = await _userRepository.FindByIdAsync(membership.UserId, cancellationToken);
            details.Add(new ProjectMembershipDetail(
                membership.UserId,
                user?.Name ?? "(unbekannter Nutzer)",
                user?.Email.Value ?? string.Empty,
                membership.Role));
        }

        return details;
    }
}
