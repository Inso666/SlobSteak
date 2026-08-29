using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Shared.ValueObjects;

namespace SlobSteak.Domain.Stakeholders;

/// <summary>
/// Aggregate Root für einen Stakeholder (Bounded Context StakeholderManagement), Felder gemäß
/// PRD Abschnitt 4.1 (Entität <c>stakeholders</c>).
/// </summary>
/// <remarks>
/// US-020 (Stakeholder-Aggregate): <see cref="Create"/> ist der vorgesehene Weg, einen neuen
/// Stakeholder fachlich korrekt anzulegen; <see cref="UpdateDetails"/>/<see cref="SoftDelete"/>/
/// <see cref="Restore"/> sind der einzige Weg, ihn zu ändern bzw. seinen Lebenszyklus zu steuern.
/// Der öffentliche Konstruktor bleibt zusätzlich bestehen — er wird von EF Core zur
/// Rematerialisierung aus der Datenbank verwendet (Parameterbindung nach Property-Namen), analog
/// zu <see cref="Identity.User"/> (US-004). US-039: Umfasst als Teil des Aggregates auch die
/// <see cref="StakeholderCommunicationAssignment"/>-Zuordnungen (<see cref="CommunicationAssignments"/>)
/// — anders als Referenzen auf andere Bounded Contexts (z. B. <c>CommunicationType</c>) ist dies
/// eine Intra-Aggregate-Beziehung, für die CLAUDE.md Abschnitt 3.1 eine EF-Core-Navigation nicht
/// ausschließt (das Verbot gilt für Cross-Aggregate-/Cross-Bounded-Context-Referenzen), analog zu
/// <see cref="Projects.Project"/>/<see cref="Projects.ProjectMembership"/> (US-011, siehe ADR-0006).
/// </remarks>
public sealed class Stakeholder
{
    private readonly List<StakeholderCommunicationAssignment> _communicationAssignments = new();

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

    /// <summary>Nullable, primär für <see cref="StakeholderType.Person"/> relevant — bei
    /// <see cref="StakeholderType.Organization"/> besteht bewusst keine Domain-Restriktion
    /// (US-020 Akzeptanzkriterium 3): eine etwaige Ausblendung ist rein UI-seitig (PRD F1.1
    /// Edge-Case).</summary>
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

    /// <summary>Kommunikationszuordnungen dieses Stakeholders (US-039). Nur über
    /// <see cref="AssignCommunication"/>/<see cref="UpdateCommunicationAssignment"/>/
    /// <see cref="RemoveCommunicationAssignment"/> veränderbar.</summary>
    public IReadOnlyCollection<StakeholderCommunicationAssignment> CommunicationAssignments =>
        _communicationAssignments.AsReadOnly();

    /// <summary>Erzeugt einen neuen Stakeholder mit den übergebenen Stammdaten.</summary>
    /// <param name="email">Optional; wird nur bei nicht-leerem Wert als <see cref="ValueObjects.Email"/>
    /// validiert (US-020 Akzeptanzkriterium 2) — ein leeres Feld ist zulässig.</param>
    /// <exception cref="StakeholderNameRequiredError"><paramref name="name"/> ist leer oder
    /// besteht nur aus Leerzeichen.</exception>
    /// <exception cref="InvalidEmailFormatError"><paramref name="email"/> ist gesetzt, aber kein
    /// gültiges <see cref="ValueObjects.Email"/>-Format.</exception>
    public static Stakeholder Create(
        Guid projectId,
        StakeholderType type,
        string name,
        string? organization,
        string? position,
        string? email,
        string? phone,
        string? locationDepartment,
        string? description,
        Guid createdBy)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new StakeholderNameRequiredError();
        }

        var emailValueObject = string.IsNullOrWhiteSpace(email) ? null : new Email(email);
        var now = DateTimeOffset.UtcNow;

        return new Stakeholder(
            Guid.NewGuid(),
            projectId,
            type,
            name,
            organization,
            position,
            emailValueObject,
            phone,
            locationDepartment,
            description,
            createdBy,
            now,
            createdBy,
            now,
            deletedAt: null,
            deletedBy: null);
    }

    /// <summary>Aktualisiert die Stammdaten und setzt <see cref="UpdatedBy"/>/<see cref="UpdatedAt"/>
    /// (US-020 Akzeptanzkriterium 4). <paramref name="email"/> wird analog zu <see cref="Create"/>
    /// behandelt (optional, nur bei nicht-leerem Wert validiert).</summary>
    /// <exception cref="StakeholderNameRequiredError"><paramref name="name"/> ist leer oder
    /// besteht nur aus Leerzeichen.</exception>
    /// <exception cref="InvalidEmailFormatError"><paramref name="email"/> ist gesetzt, aber kein
    /// gültiges <see cref="ValueObjects.Email"/>-Format.</exception>
    public void UpdateDetails(
        StakeholderType type,
        string name,
        string? organization,
        string? position,
        string? email,
        string? phone,
        string? locationDepartment,
        string? description,
        Guid updatedBy)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new StakeholderNameRequiredError();
        }

        Type = type;
        Name = name;
        Organization = organization;
        Position = position;
        Email = string.IsNullOrWhiteSpace(email) ? null : new Email(email);
        Phone = phone;
        LocationDepartment = locationDepartment;
        Description = description;
        UpdatedBy = updatedBy;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    /// <summary>Markiert den Stakeholder als gelöscht (<see cref="DeletedAt"/>/<see cref="DeletedBy"/>).
    /// Idempotent (US-020 Akzeptanzkriterium 5, PRD F1.3 Edge Case): ein erneuter Aufruf auf einem
    /// bereits gelöschten Stakeholder ändert <see cref="DeletedAt"/> nicht erneut.</summary>
    public void SoftDelete(Guid deletedBy)
    {
        if (DeletedAt is not null)
        {
            return;
        }

        DeletedAt = DateTimeOffset.UtcNow;
        DeletedBy = deletedBy;
    }

    /// <summary>Macht ein zuvor gesetztes Soft-Delete rückgängig (<see cref="DeletedAt"/>/
    /// <see cref="DeletedBy"/> werden auf <c>null</c> zurückgesetzt). Idempotent — auf einem
    /// bereits aktiven Stakeholder passiert nichts.</summary>
    public void Restore()
    {
        DeletedAt = null;
        DeletedBy = null;
    }

    /// <summary>Liefert <c>true</c>, wenn der Stakeholder soft-gelöscht ist.</summary>
    public bool IsDeleted() => DeletedAt is not null;

    /// <summary>Ordnet diesem Stakeholder die Kommunikationsart <paramref name="communicationTypeId"/>
    /// mit gegebener Frequenz/Kanal zu (US-039 Akzeptanzkriterium 1).</summary>
    /// <exception cref="AssignmentAlreadyExistsError">Für <paramref name="communicationTypeId"/>
    /// existiert bei diesem Stakeholder bereits eine Zuordnung — Frequenz/Kanal müssen stattdessen
    /// über <see cref="UpdateCommunicationAssignment"/> geändert werden.</exception>
    public void AssignCommunication(Guid communicationTypeId, CommunicationFrequency frequency, CommunicationChannel channel)
    {
        if (_communicationAssignments.Any(a => a.CommunicationTypeId == communicationTypeId))
        {
            throw new AssignmentAlreadyExistsError(Id, communicationTypeId);
        }

        _communicationAssignments.Add(new StakeholderCommunicationAssignment(Guid.NewGuid(), Id, communicationTypeId, frequency, channel));
    }

    /// <summary>Aktualisiert Frequenz/Kanal einer bestehenden Kommunikationszuordnung (US-039
    /// Akzeptanzkriterium 2).</summary>
    /// <exception cref="AssignmentNotFoundError">Für <paramref name="communicationTypeId"/>
    /// existiert bei diesem Stakeholder keine Zuordnung.</exception>
    public void UpdateCommunicationAssignment(Guid communicationTypeId, CommunicationFrequency frequency, CommunicationChannel channel)
    {
        var assignment = _communicationAssignments.SingleOrDefault(a => a.CommunicationTypeId == communicationTypeId)
            ?? throw new AssignmentNotFoundError(Id, communicationTypeId);

        assignment.UpdateFrequencyAndChannel(frequency, channel);
    }

    /// <summary>Entfernt die Kommunikationszuordnung für <paramref name="communicationTypeId"/>
    /// (US-039 Akzeptanzkriterium 3). Idempotent, analog zu
    /// <see cref="Projects.Project.RemoveMember"/> — existiert keine Zuordnung, passiert nichts
    /// (kein Fehler).</summary>
    public void RemoveCommunicationAssignment(Guid communicationTypeId)
    {
        var assignment = _communicationAssignments.SingleOrDefault(a => a.CommunicationTypeId == communicationTypeId);
        if (assignment is not null)
        {
            _communicationAssignments.Remove(assignment);
        }
    }
}
