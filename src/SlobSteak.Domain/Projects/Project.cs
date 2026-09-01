using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Domain.Projects;

/// <summary>
/// Aggregate Root für ein Projekt (Bounded Context ProjectManagement), Felder gemäß PRD
/// Abschnitt 4.1 (Entität <c>projects</c>). Umfasst als Teil des Aggregates auch die
/// <see cref="ProjectMembership"/>-Mitgliedschaften (US-011) — anders als Referenzen auf andere
/// Bounded Contexts (z. B. <c>User</c>) ist dies eine Intra-Aggregate-Beziehung, für die CLAUDE.md
/// Abschnitt 3.1 eine EF-Core-Navigation nicht ausschließt (das Verbot gilt für
/// Cross-Aggregate-/Cross-Bounded-Context-Referenzen, siehe ADR-0001).
/// </summary>
/// <remarks>
/// US-010: <see cref="Create"/> ist der vorgesehene Weg, ein neues Projekt fachlich korrekt
/// anzulegen. US-011: <see cref="AssignMember"/>/<see cref="ChangeMemberRole"/>/
/// <see cref="RemoveMember"/> sind der einzige Weg, Mitgliedschaften zu verwalten.
/// </remarks>
public sealed class Project
{
    private readonly List<ProjectMembership> _memberships = new();

    /// <summary>Öffentlicher Konstruktor — wird auch von EF Core zur Rematerialisierung aus der
    /// Datenbank verwendet (Parameterbindung nach Property-Namen, analog zu
    /// <see cref="Assessments.StakeholderAssessment"/>). <paramref name="updatedAt"/> ist bewusst
    /// nicht optional: ein optionaler <c>DateTimeOffset?</c>-Parameter ließe sich nicht mehr an die
    /// (nicht-nullable) <see cref="UpdatedAt"/>-Spalte binden (EF-Core-Konstruktorbindung verlangt
    /// exakte Typgleichheit) — <see cref="Create"/> übergibt hierfür einfach denselben Wert wie
    /// <paramref name="createdAt"/>.</summary>
    public Project(Guid id, string name, string? description, ProjectStatus status, DateTimeOffset createdAt, DateTimeOffset updatedAt)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Name darf nicht leer sein.", nameof(name));
        }

        Id = id;
        Name = name;
        Description = description;
        Status = status;
        CreatedAt = createdAt;
        UpdatedAt = updatedAt;
    }

    public Guid Id { get; private set; }

    public string Name { get; private set; }

    public string? Description { get; private set; }

    public ProjectStatus Status { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>Zeitpunkt der letzten fachlichen Änderung (US-076) — initial gleich
    /// <see cref="CreatedAt"/>, aktualisiert durch <see cref="Archive"/>, <see cref="Reactivate"/>,
    /// <see cref="AssignMember"/>, <see cref="ChangeMemberRole"/> und <see cref="RemoveMember"/>
    /// (nur, wenn dabei tatsächlich eine Mitgliedschaft entfernt wurde — idempotente Aufrufe ohne
    /// Wirkung ändern <see cref="UpdatedAt"/> nicht). Grundlage für die Kartenfußzeile „Aktualisiert
    /// vor …“ und das Sortierkriterium „Zuletzt aktualisiert“ der Projektübersicht.</summary>
    public DateTimeOffset UpdatedAt { get; private set; }

    /// <summary>Mitgliedschaften dieses Projekts (US-011). Nur über
    /// <see cref="AssignMember"/>/<see cref="ChangeMemberRole"/>/<see cref="RemoveMember"/>
    /// veränderbar.</summary>
    public IReadOnlyCollection<ProjectMembership> Memberships => _memberships.AsReadOnly();

    /// <summary>Erzeugt ein neues Projekt mit <see cref="ProjectStatus.Active"/>.</summary>
    /// <exception cref="ProjectNameRequiredError"><paramref name="name"/> ist leer oder besteht
    /// nur aus Leerzeichen.</exception>
    public static Project Create(string name, string? description)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ProjectNameRequiredError();
        }

        var now = DateTimeOffset.UtcNow;
        return new Project(Guid.NewGuid(), name, description, ProjectStatus.Active, now, now);
    }

    /// <summary>Setzt den Status auf <see cref="ProjectStatus.Archived"/>.</summary>
    public void Archive()
    {
        Status = ProjectStatus.Archived;
        Touch();
    }

    /// <summary>Setzt den Status zurück auf <see cref="ProjectStatus.Active"/>.</summary>
    public void Reactivate()
    {
        Status = ProjectStatus.Active;
        Touch();
    }

    /// <summary>Ordnet <paramref name="userId"/> die Rolle <paramref name="role"/> in diesem
    /// Projekt zu.</summary>
    /// <exception cref="MembershipAlreadyExistsError">Für <paramref name="userId"/> existiert in
    /// diesem Projekt bereits eine Mitgliedschaft — die Rolle muss stattdessen über
    /// <see cref="ChangeMemberRole"/> geändert werden.</exception>
    public void AssignMember(Guid userId, ProjectRole role)
    {
        if (_memberships.Any(m => m.UserId == userId))
        {
            throw new MembershipAlreadyExistsError(Id, userId);
        }

        _memberships.Add(new ProjectMembership(Guid.NewGuid(), Id, userId, role));
        Touch();
    }

    /// <summary>Aktualisiert die Rolle einer bestehenden Mitgliedschaft.</summary>
    /// <exception cref="MembershipNotFoundError">Für <paramref name="userId"/> existiert in
    /// diesem Projekt keine Mitgliedschaft.</exception>
    public void ChangeMemberRole(Guid userId, ProjectRole newRole)
    {
        var membership = _memberships.SingleOrDefault(m => m.UserId == userId)
            ?? throw new MembershipNotFoundError(Id, userId);

        membership.UpdateRole(newRole);
        Touch();
    }

    /// <summary>Entfernt die Mitgliedschaft von <paramref name="userId"/> in diesem Projekt.
    /// Idempotent — existiert keine Mitgliedschaft, passiert nichts (kein Fehler, <see cref="UpdatedAt"/>
    /// bleibt unverändert).</summary>
    public void RemoveMember(Guid userId)
    {
        var membership = _memberships.SingleOrDefault(m => m.UserId == userId);
        if (membership is not null)
        {
            _memberships.Remove(membership);
            Touch();
        }
    }

    /// <summary>Setzt <see cref="UpdatedAt"/> auf den aktuellen Zeitpunkt (US-076).</summary>
    private void Touch() => UpdatedAt = DateTimeOffset.UtcNow;
}
