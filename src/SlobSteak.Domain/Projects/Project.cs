namespace SlobSteak.Domain.Projects;

/// <summary>
/// Aggregate Root für ein Projekt (Bounded Context ProjectManagement), Felder gemäß PRD
/// Abschnitt 4.1 (Entität <c>projects</c>).
/// </summary>
/// <remarks>
/// Bewusst minimales Skeleton im Rahmen von US-003 (Datenbankschema): Dieser Konstruktor prüft
/// nur strukturelle Grundbedingungen. Die <c>Create</c>-Factory-Methode mit
/// <c>ProjectNameRequiredError</c>, <c>Archive</c>/<c>Reactivate</c> sowie das
/// Repository-Interface <c>IProjectRepository</c> werden erst in US-010 (Project-Aggregate)
/// ergänzt; die Mitgliederverwaltung (<c>AssignMember</c>/<c>ChangeMemberRole</c>/<c>RemoveMember</c>)
/// erst in US-011 — siehe <c>docs/adr/0001-domain-entity-skeletons-vor-aggregate-stories.md</c>.
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
}
