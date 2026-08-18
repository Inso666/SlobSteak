namespace SlobSteak.Domain.Projects;

/// <summary>
/// Repository-Abstraktion für das <see cref="Project"/>-Aggregate (Bounded Context
/// ProjectManagement). Persistenzdetails liegen ausschließlich in der Infrastructure-
/// Implementierung (CLAUDE.md Abschnitt 3.1).
/// </summary>
public interface IProjectRepository
{
    Task<Project?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task SaveAsync(Project project, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Project>> FindAllAsync(CancellationToken cancellationToken = default);

    /// <summary>Liefert alle Projekte, denen der Nutzer <paramref name="userId"/> über eine
    /// <see cref="ProjectMembership"/> zugeordnet ist. Verknüpfung ausschließlich über die rohe
    /// <c>UserId</c> — keine EF-Core-Navigation über Bounded-Context-Grenzen hinweg (CLAUDE.md
    /// Abschnitt 3.1).</summary>
    Task<IReadOnlyList<Project>> FindByMemberUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
}
