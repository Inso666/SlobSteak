using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.ValueObjects;

namespace SlobSteak.Domain.Stakeholders;

/// <summary>
/// Aggregate Root für einen Stakeholder (Bounded Context StakeholderManagement), Felder gemäß
/// PRD Abschnitt 4.1 (Entität <c>stakeholders</c>).
/// </summary>
/// <remarks>
/// Bewusst minimales Skeleton im Rahmen von US-003 (Datenbankschema): Dieser Konstruktor prüft
/// nur strukturelle Grundbedingungen. Die <c>Create</c>-Factory-Methode mit
/// <c>StakeholderNameRequiredError</c>, <c>UpdateDetails</c>, <c>SoftDelete</c>/<c>Restore</c>
/// (inkl. Idempotenz), <c>IsDeleted</c> sowie das Repository-Interface
/// <c>IStakeholderRepository</c> werden erst in US-020 (Stakeholder-Aggregate) ergänzt; die
/// Kommunikationszuordnungen (<c>AssignCommunication</c> usw.) erst in US-039 — siehe
/// <c>docs/adr/0001-domain-entity-skeletons-vor-aggregate-stories.md</c>.
/// </remarks>
public sealed class Stakeholder
{
    public Stakeholder(
        Guid id,
        Guid projectId,
        StakeholderType type,
        string name,
        string? organization,
        string? position,
        Email? email,
        string? phone,
        string? locationDepartment,
        string? description,
        Guid createdBy,
        DateTimeOffset createdAt,
        Guid updatedBy,
        DateTimeOffset updatedAt,
        DateTimeOffset? deletedAt,
        Guid? deletedBy)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Name darf nicht leer sein.", nameof(name));
        }

        Id = id;
        ProjectId = projectId;
        Type = type;
        Name = name;
        Organization = organization;
        Position = position;
        Email = email;
        Phone = phone;
        LocationDepartment = locationDepartment;
        Description = description;
        CreatedBy = createdBy;
        CreatedAt = createdAt;
        UpdatedBy = updatedBy;
        UpdatedAt = updatedAt;
        DeletedAt = deletedAt;
        DeletedBy = deletedBy;
    }

    public Guid Id { get; private set; }

    /// <summary>Ein Stakeholder gehört zu genau einem Projekt (unveränderlich nach Erstellung).</summary>
    public Guid ProjectId { get; private set; }

    public StakeholderType Type { get; private set; }

    public string Name { get; private set; }

    public string? Organization { get; private set; }

    /// <summary>Nullable, primär für <see cref="StakeholderType.Person"/> relevant.</summary>
    public string? Position { get; private set; }

    public Email? Email { get; private set; }

    public string? Phone { get; private set; }

    public string? LocationDepartment { get; private set; }

    public string? Description { get; private set; }

    public Guid CreatedBy { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public Guid UpdatedBy { get; private set; }

    public DateTimeOffset UpdatedAt { get; private set; }

    /// <summary>Soft-Delete-Marker. <c>null</c> = aktiv.</summary>
    public DateTimeOffset? DeletedAt { get; private set; }

    public Guid? DeletedBy { get; private set; }
}
