namespace SlobSteak.Domain.Communications;

/// <summary>
/// Repository-Abstraktion für das <see cref="CommunicationType"/>-Aggregate (Bounded Context
/// CommunicationCatalog). Persistenzdetails (EF Core, Tabelle <c>communication_types</c>) liegen
/// ausschließlich in der Infrastructure-Implementierung; Domain und Application kennen nur dieses
/// Interface (CLAUDE.md Abschnitt 3.1).
/// </summary>
public interface ICommunicationTypeRepository
{
    /// <summary>Lädt einen <see cref="CommunicationType"/> anhand seiner Id, oder <c>null</c>,
    /// falls keiner existiert.</summary>
    Task<CommunicationType?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Prüft, ob bereits ein Katalogeintrag mit diesem (instanzweit eindeutigen) Namen
    /// existiert — Grundlage der proaktiven <c>NAME_ALREADY_IN_USE</c>-Prüfung, zusätzlich zum
    /// DB-Unique-Index als zweite Verteidigungslinie bei parallelem Zugriff.
    /// <paramref name="excludingId"/> schließt (beim Umbenennen) den Eintrag selbst von der
    /// Kollisionsprüfung aus.</summary>
    Task<bool> ExistsByNameAsync(string name, Guid? excludingId = null, CancellationToken cancellationToken = default);

    /// <summary>Legt einen neuen <see cref="CommunicationType"/> an oder aktualisiert einen
    /// bestehenden.</summary>
    Task SaveAsync(CommunicationType communicationType, CancellationToken cancellationToken = default);

    /// <summary>Lädt alle Katalogeinträge (US-037 Akzeptanzkriterium 4). Mit
    /// <paramref name="activeOnly"/><c>= true</c> ausschließlich aktive Einträge (Auswahl bei
    /// neuen Zuordnungen), sonst alle Einträge inkl. deaktivierter (historische Anzeige).</summary>
    Task<IReadOnlyList<CommunicationType>> FindAllAsync(bool activeOnly, CancellationToken cancellationToken = default);
}
