using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Domain.Projects;

/// <summary>
/// Zeile der Projektübersicht (US-018) für einen einzelnen Nutzer: Projekt, in dem der Nutzer eine
/// <see cref="ProjectMembership"/> hat, mit seiner Rolle darin und der Anzahl (nicht gelöschter)
/// Stakeholder. Reines Read-Modell (CQRS-Query), keine Aggregate-Rekonstruktion — daher direkt aus
/// mehreren Tabellen zusammengesetzt statt über <see cref="IProjectRepository"/> geladen.
/// </summary>
/// <remarks>
/// US-074: <see cref="Status"/> und <see cref="CreatedAt"/> additiv ergänzt — beide existieren
/// bereits auf dem <see cref="Project"/>-Aggregate (keine neue Invariante, keine EF-Core-Migration
/// nötig), waren aber bislang nur in der Admin-Projektliste (<c>AdminProjectController</c>)
/// exponiert. <see cref="Status"/> steuert die „Archiviert"-Kennzeichnung der Projektkarten,
/// <see cref="CreatedAt"/> das Sortierkriterium „Neu zuerst" (Story-Akzeptanzkriterien).
/// US-076: <see cref="UpdatedAt"/> additiv ergänzt (neues <see cref="Project.UpdatedAt"/>-Feld,
/// eigene EF-Core-Migration) — Grundlage der Kartenfußzeile „Aktualisiert vor …" sowie des
/// zusätzlichen Sortierkriteriums „Zuletzt aktualisiert".
/// </remarks>
public sealed record ProjectOverviewItem(
    Guid ProjectId,
    string ProjectName,
    ProjectRole Role,
    int StakeholderCount,
    ProjectStatus Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
