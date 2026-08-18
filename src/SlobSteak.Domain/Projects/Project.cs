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

    public Project(Guid id, string name, string? description, ProjectStatus status, DateTimeOffset createdAt)
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
    }

    public Guid Id { get; private set; }

    public string Name { get; private set; }

    public string? Description { get; private set; }

    public ProjectStatus Status { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

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

        return new Project(Guid.NewGuid(), name, description, ProjectStatus.Active, DateTimeOffset.UtcNow);
    }

    /// <summary>Setzt den Status auf <see cref="ProjectStatus.Archived"/>.</summary>
    public void Archive() => Status = ProjectStatus.Archived;

    /// <summary>Setzt den Status zurück auf <see cref="ProjectStatus.Active"/>.</summary>
    public void Reactivate() => Status = ProjectStatus.Active;

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
    }

    /// <summary>Aktualisiert die Rolle einer bestehenden Mitgliedschaft.</summary>
    /// <exception cref="MembershipNotFoundError">Für <paramref name="userId"/> existiert in
    /// diesem Projekt keine Mitgliedschaft.</exception>
    public void ChangeMemberRole(Guid userId, ProjectRole newRole)
    {
        var membership = _memberships.SingleOrDefault(m => m.UserId == userId)
            ?? throw new MembershipNotFoundError(Id, userId);

        membership.UpdateRole(newRole);
    }

    /// <summary>Entfernt die Mitgliedschaft von <paramref name="userId"/> in diesem Projekt.
    /// Idempotent — existiert keine Mitgliedschaft, passiert nichts (kein Fehler).</summary>
    public void RemoveMember(Guid userId)
    {
        var membership = _memberships.SingleOrDefault(m => m.UserId == userId);
        if (membership is not null)
        {
            _memberships.Remove(membership);
        }
    }
}
