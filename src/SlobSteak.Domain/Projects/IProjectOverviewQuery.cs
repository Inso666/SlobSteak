namespace SlobSteak.Domain.Projects;

/// <summary>
/// Port (US-018) für die Projektübersicht eines Nutzers (Screen S2), implementiert in
/// <c>SlobSteak.Infrastructure</c> als direkte, lesende Query über mehrere Tabellen (analog zu
/// <see cref="IProjectRepository"/> — hier liegt das Interface aus demselben Grund in der Domain:
/// CLAUDE.md Abschnitt 3.1 erlaubt <c>SlobSteak.Infrastructure</c> nur eine Abhängigkeit auf
/// <c>SlobSteak.Domain</c>, nicht auf <c>SlobSteak.Application</c>). Bewusst kein
/// Application-Service, der über <see cref="IProjectRepository"/> orchestriert: die
/// Projektions-Query (Projekt + eigene Rolle + Stakeholder-Anzahl) ist ein reines Read-Modell,
/// keine Aggregate-Rekonstruktion.
/// </summary>
public interface IProjectOverviewQuery
{
    /// <summary>Liefert ausschließlich Projekte, in denen <paramref name="userId"/> eine
    /// <see cref="ProjectMembership"/> hat (US-018 Akzeptanzkriterium 1/Invariante).</summary>
    Task<IReadOnlyList<ProjectOverviewItem>> GetForUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
