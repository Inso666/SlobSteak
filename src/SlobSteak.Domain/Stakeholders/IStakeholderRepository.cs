namespace SlobSteak.Domain.Stakeholders;

/// <summary>
/// Repository-Abstraktion für das <see cref="Stakeholder"/>-Aggregate (Bounded Context
/// StakeholderManagement). Persistenzdetails liegen ausschließlich in der Infrastructure-
/// Implementierung (CLAUDE.md Abschnitt 3.1).
/// </summary>
public interface IStakeholderRepository
{
    /// <summary>Lädt einen Stakeholder anhand seiner Id. Ist <paramref name="includeDeleted"/>
    /// <c>false</c> (Default), liefert ein soft-gelöschter Stakeholder <c>null</c> — Standard-
    /// Leseabfragen filtern <c>deleted_at IS NULL</c> serverseitig (PRD Abschnitt 4.3 Punkt 5).</summary>
    Task<Stakeholder?> FindByIdAsync(Guid id, bool includeDeleted = false, CancellationToken cancellationToken = default);

    /// <summary>Liefert alle nicht gelöschten Stakeholder eines Projekts.</summary>
    Task<IReadOnlyList<Stakeholder>> FindActiveByProjectAsync(Guid projectId, CancellationToken cancellationToken = default);

    /// <summary>Liefert alle soft-gelöschten Stakeholder eines Projekts (Papierkorb-Ansicht,
    /// US-024).</summary>
    Task<IReadOnlyList<Stakeholder>> FindDeletedByProjectAsync(Guid projectId, CancellationToken cancellationToken = default);

    Task SaveAsync(Stakeholder stakeholder, CancellationToken cancellationToken = default);

    /// <summary>Prüft, ob im Projekt bereits ein Stakeholder mit demselben Namen existiert
    /// (case-insensitiver Vergleich) — bewusst inklusive soft-gelöschter Datensätze (PRD Abschnitt
    /// 4.3: der Hinweistext beim Anlegen soll auch auf einen bereits gelöschten, ähnlich
    /// benannten Stakeholder hinweisen können). <paramref name="excludeStakeholderId"/> schließt
    /// den Stakeholder selbst aus (z. B. bei <see cref="Stakeholder.UpdateDetails"/>, ohne dass
    /// der unveränderte eigene Name als Duplikat erkannt wird).</summary>
    Task<bool> ExistsSimilarNameInProjectAsync(
        Guid projectId,
        string name,
        Guid? excludeStakeholderId = null,
        CancellationToken cancellationToken = default);
}
