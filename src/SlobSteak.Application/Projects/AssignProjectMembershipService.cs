using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Application.Projects;

/// <summary>
/// Application Service (US-015): weist Nutzer Projekten mit einer Rolle zu, ändert bestehende
/// Zuweisungen oder entzieht sie — ausschließlich Admins vorbehalten (PRD Berechtigungsmatrix,
/// Abschnitt 2.3). Orchestriert nur den Use Case; die eigentlichen Regeln (höchstens eine
/// Mitgliedschaft je Nutzer und Projekt, Entzug löscht keine Assessments) liegen im
/// <see cref="Project"/>-Aggregate (US-011).
/// </summary>
public sealed class AssignProjectMembershipService
{
    private readonly IProjectRepository _projectRepository;
    private readonly IUserRepository _userRepository;

    public AssignProjectMembershipService(IProjectRepository projectRepository, IUserRepository userRepository)
    {
        _projectRepository = projectRepository;
        _userRepository = userRepository;
    }

    /// <summary>Liefert <c>null</c>, wenn <paramref name="projectId"/> oder <paramref name="userId"/>
    /// nicht existiert.</summary>
    /// <exception cref="Domain.Shared.Exceptions.MembershipAlreadyExistsError">Für
    /// <paramref name="userId"/> existiert in diesem Projekt bereits eine Mitgliedschaft.</exception>
    public async Task<Project?> AssignMemberAsync(Guid projectId, Guid userId, ProjectRole role, CancellationToken cancellationToken = default)
    {
        var project = await _projectRepository.FindByIdAsync(projectId, cancellationToken);
        if (project is null || await _userRepository.FindByIdAsync(userId, cancellationToken) is null)
        {
            return null;
        }

        project.AssignMember(userId, role);
        await _projectRepository.SaveAsync(project, cancellationToken);
        return project;
    }

    /// <summary>Liefert <c>null</c>, wenn <paramref name="projectId"/> nicht existiert.</summary>
    /// <exception cref="Domain.Shared.Exceptions.MembershipNotFoundError">Für
    /// <paramref name="userId"/> existiert in diesem Projekt keine Mitgliedschaft.</exception>
    public async Task<Project?> ChangeMemberRoleAsync(Guid projectId, Guid userId, ProjectRole newRole, CancellationToken cancellationToken = default)
    {
        var project = await _projectRepository.FindByIdAsync(projectId, cancellationToken);
        if (project is null)
        {
            return null;
        }

        project.ChangeMemberRole(userId, newRole);
        await _projectRepository.SaveAsync(project, cancellationToken);
        return project;
    }

    /// <summary>Entfernt die Mitgliedschaft (idempotent, siehe <see cref="Project.RemoveMember"/>).
    /// Liefert <c>false</c>, wenn <paramref name="projectId"/> nicht existiert.</summary>
    public async Task<bool> RemoveMemberAsync(Guid projectId, Guid userId, CancellationToken cancellationToken = default)
    {
        var project = await _projectRepository.FindByIdAsync(projectId, cancellationToken);
        if (project is null)
        {
            return false;
        }

        project.RemoveMember(userId);
        await _projectRepository.SaveAsync(project, cancellationToken);
        return true;
    }
}
