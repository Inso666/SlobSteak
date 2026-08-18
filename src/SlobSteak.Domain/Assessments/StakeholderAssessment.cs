using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.ValueObjects;

namespace SlobSteak.Domain.Assessments;

/// <summary>
/// Aggregate Root für die rollenspezifische Einfluss-/Interesse-Bewertung eines Stakeholders
/// (Bounded Context StakeholderAssessment, referenziert <c>Stakeholder</c> per ID), Felder gemäß
/// PRD Abschnitt 4.1 (Entität <c>stakeholder_assessments</c>).
/// </summary>
/// <remarks>
/// Bewusst minimales Skeleton im Rahmen von US-003 (Datenbankschema): Dieser Konstruktor prüft
/// nur strukturelle Grundbedingungen, nicht die fachliche Einschränkung von <see cref="Role"/> auf
/// perspektiv-tragende Rollen. Die <c>Create</c>-Factory-Methode mit
/// <c>InvalidAssessmentRoleError</c>, <c>Update(..., expectedVersion)</c> mit
/// <c>StaleAssessmentError</c> sowie das Repository-Interface
/// <c>IStakeholderAssessmentRepository</c> werden erst in US-027 (StakeholderAssessment-Aggregate)
/// ergänzt. <see cref="Version"/> ist gemäß
/// <c>docs/adr/0002-optimistic-concurrency-assessment-version.md</c> das gewählte
/// Optimistic-Concurrency-Feld — siehe auch
/// <c>docs/adr/0001-domain-entity-skeletons-vor-aggregate-stories.md</c>.
/// </remarks>
public sealed class StakeholderAssessment
{
    public StakeholderAssessment(
        Guid id,
        Guid stakeholderId,
        ProjectRole role,
        Score influence,
        Score interest,
        string? notes,
        Guid updatedBy,
        DateTimeOffset updatedAt,
        int version = 1)
    {
        Id = id;
        StakeholderId = stakeholderId;
        Role = role;
        Influence = influence;
        Interest = interest;
        Notes = notes;
        UpdatedBy = updatedBy;
        UpdatedAt = updatedAt;
        Version = version;
    }

    public Guid Id { get; private set; }

    public Guid StakeholderId { get; private set; }

    /// <summary>Nur perspektiv-tragende Rollen (<c>PL</c>, <c>Coreteam</c>, <c>Architect</c>) sind
    /// fachlich zulässig; die Durchsetzung als <c>InvalidAssessmentRoleError</c> folgt in US-027.</summary>
    public ProjectRole Role { get; private set; }

    public Score Influence { get; private set; }

    public Score Interest { get; private set; }

    public string? Notes { get; private set; }

    /// <summary>Letzter Bearbeiter, für "zuletzt geändert von/am".</summary>
    public Guid UpdatedBy { get; private set; }

    public DateTimeOffset UpdatedAt { get; private set; }

    /// <summary>Optimistic-Concurrency-Token, siehe ADR 0002. Wird von der künftigen
    /// <c>Update</c>-Methode (US-027) bei jeder erfolgreichen Änderung erhöht.</summary>
    public int Version { get; private set; }
}
