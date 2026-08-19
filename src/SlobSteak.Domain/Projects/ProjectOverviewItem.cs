using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Domain.Projects;

/// <summary>
/// Zeile der Projektübersicht (US-018) für einen einzelnen Nutzer: Projekt, in dem der Nutzer eine
/// <see cref="ProjectMembership"/> hat, mit seiner Rolle darin und der Anzahl (nicht gelöschter)
/// Stakeholder. Reines Read-Modell (CQRS-Query), keine Aggregate-Rekonstruktion — daher direkt aus
/// mehreren Tabellen zusammengesetzt statt über <see cref="IProjectRepository"/> geladen.
/// </summary>
public sealed record ProjectOverviewItem(Guid ProjectId, string ProjectName, ProjectRole Role, int StakeholderCount);
