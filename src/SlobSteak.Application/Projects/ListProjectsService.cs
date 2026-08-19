using SlobSteak.Domain.Projects;

namespace SlobSteak.Application.Projects;

/// <summary>
/// Application Service (US-017): listet alle Projekte für den Admin-Bereich. Trivialer Use Case,
/// aber konsequent über die Application-Schicht geführt statt den Controller direkt gegen
/// <see cref="IProjectRepository"/> arbeiten zu lassen (CLAUDE.md Abschnitt 3.1), analog zu
/// <see cref="SlobSteak.Application.Identity.ListUsersService"/> aus US-016.
/// </summary>
public sealed class ListProjectsService
{
    private readonly IProjectRepository _projectRepository;

    public ListProjectsService(IProjectRepository projectRepository)
    {
        _projectRepository = projectRepository;
    }

    public Task<IReadOnlyList<Project>> ListProjectsAsync(CancellationToken cancellationToken = default) =>
        _projectRepository.FindAllAsync(cancellationToken);
}
