using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Domain.Communications;

/// <summary>
/// Aggregate Root für einen instanzweiten Kommunikationsarten-Katalogeintrag (Bounded Context
/// CommunicationCatalog), Felder gemäß PRD Abschnitt 4.1 (Entität <c>communication_types</c>).
/// </summary>
/// <remarks>
/// US-037: <see cref="Create"/> ist der vorgesehene Weg, einen neuen Katalogeintrag fachlich
/// korrekt anzulegen; <see cref="Rename"/>/<see cref="Deactivate"/>/<see cref="Activate"/> sind
/// der einzige Weg, einen bestehenden Eintrag zu ändern. Ergänzt das bewusst minimale Skeleton aus
/// US-003 (Datenbankschema) um Verhalten — siehe
/// <c>docs/adr/0001-domain-entity-skeletons-vor-aggregate-stories.md</c>. Die instanzweite
/// Namenseindeutigkeit (DB Unique Constraint <c>ix_communication_types_name</c> aus US-003) wird
/// bewusst nicht hier, sondern in der Application-/Infrastructure-Schicht durchgesetzt (proaktive
/// Prüfung + Übersetzung der DB-Unique-Verletzung in <see cref="CommunicationTypeNameAlreadyInUseError"/>),
/// analog zu <see cref="Identity.User"/>/<c>EmailAlreadyInUseError</c> (US-012).
/// </remarks>
public sealed class CommunicationType
{
    public CommunicationType(Guid id, string name, bool isActive, DateTimeOffset createdAt)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Name darf nicht leer sein.", nameof(name));
        }

        Id = id;
        Name = name;
        IsActive = isActive;
        CreatedAt = createdAt;
    }

    public Guid Id { get; private set; }

    public string Name { get; private set; }

    /// <summary>
    /// <c>true</c>, solange der Eintrag bei neuen Zuordnungen zur Auswahl steht. Ein deaktivierter
    /// Eintrag (<c>false</c>) bleibt am bereits zugeordneten Stakeholder sichtbar (PRD Abschnitt
    /// F5.3), wird aber nie physisch gelöscht.
    /// </summary>
    public bool IsActive { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>Erzeugt einen neuen, aktiven Katalogeintrag.</summary>
    /// <exception cref="CommunicationTypeNameRequiredError"><paramref name="name"/> ist leer oder
    /// besteht nur aus Leerzeichen.</exception>
    public static CommunicationType Create(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new CommunicationTypeNameRequiredError();
        }

        return new CommunicationType(Guid.NewGuid(), name, isActive: true, DateTimeOffset.UtcNow);
    }

    /// <summary>Benennt den Katalogeintrag um.</summary>
    /// <exception cref="CommunicationTypeNameRequiredError"><paramref name="newName"/> ist leer
    /// oder besteht nur aus Leerzeichen.</exception>
    public void Rename(string newName)
    {
        if (string.IsNullOrWhiteSpace(newName))
        {
            throw new CommunicationTypeNameRequiredError();
        }

        Name = newName;
    }

    /// <summary>Deaktiviert den Eintrag — bleibt in <c>communication_types</c> erhalten (kein
    /// Löschen), steht aber bei neuen Zuordnungen nicht mehr zur Auswahl (PRD Abschnitt F5.3).
    /// Idempotent: ein bereits deaktivierter Eintrag bleibt unverändert deaktiviert.</summary>
    public void Deactivate() => IsActive = false;

    /// <summary>Reaktiviert einen zuvor deaktivierten Eintrag. Idempotent.</summary>
    public void Activate() => IsActive = true;
}
