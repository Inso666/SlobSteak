namespace SlobSteak.Domain.Communications;

/// <summary>
/// Aggregate Root für einen instanzweiten Kommunikationsarten-Katalogeintrag (Bounded Context
/// CommunicationCatalog), Felder gemäß PRD Abschnitt 4.1 (Entität <c>communication_types</c>).
/// </summary>
/// <remarks>
/// Bewusst minimales Skeleton im Rahmen von US-003 (Datenbankschema): Dieser Konstruktor prüft
/// nur strukturelle Grundbedingungen. Umbenennen/Deaktivieren (inkl. <c>NAME_ALREADY_IN_USE</c>)
/// sowie das Repository-Interface <c>ICommunicationTypeRepository</c> werden erst in US-037
/// ergänzt — siehe <c>docs/adr/0001-domain-entity-skeletons-vor-aggregate-stories.md</c>.
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

    public bool IsActive { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }
}
