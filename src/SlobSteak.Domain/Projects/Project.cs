using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Domain.Projects;

/// <summary>
/// Aggregate Root für ein Projekt (Bounded Context ProjectManagement), Felder gemäß PRD
/// Abschnitt 4.1 (Entität <c>projects</c>).
/// </summary>
/// <remarks>
/// US-010 (Project-Aggregate): <see cref="Create"/> ist der vorgesehene Weg, ein neues Projekt
/// fachlich korrekt anzulegen. Die Mitgliederverwaltung
/// (<c>AssignMember</c>/<c>ChangeMemberRole</c>/<c>RemoveMember</c>) folgt erst in US-011 — siehe
/// <c>docs/adr/0001-domain-entity-skeletons-vor-aggregate-stories.md</c>.
/// </remarks>
public sealed class Project
{
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
}
