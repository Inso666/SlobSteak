using SlobSteak.Domain.Projects;

namespace SlobSteak.Application.Projects;

/// <summary>
/// Application Service (US-014): legt ein neues Projekt an — ausschließlich Admins vorbehalten
/// (PRD Berechtigungsmatrix, Abschnitt 2.3). Orchestriert nur den Use Case; die eigentliche
/// Erzeugung (Status <c>Active</c>, Namensprüfung) liegt in <see cref="Project.Create"/>.
/// </summary>
public sealed class CreateProjectService
{
    private readonly IProjectRepository _projectRepository;

    public CreateProjectService(IProjectRepository projectRepository)
    {
        _projectRepository = projectRepository;
    }

    /// <exception cref="Domain.Shared.Exceptions.ProjectNameRequiredError"><paramref name="name"/>
    /// ist leer oder besteht nur aus Leerzeichen.</exception>
    public async Task<Project> CreateProjectAsync(string name, string? description, CancellationToken cancellationToken = default)
    {
        var project = Project.Create(name, description);
        await _projectRepository.SaveAsync(project, cancellationToken);
        return project;
    }
}
