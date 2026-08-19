using System.Linq;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Shared.ValueObjects;

namespace SlobSteak.Domain.Assessments;

/// <summary>
/// Aggregate Root für die rollenspezifische Einfluss-/Interesse-Bewertung eines Stakeholders
/// (Bounded Context StakeholderAssessment, referenziert <c>Stakeholder</c> per ID), Felder gemäß
/// PRD Abschnitt 4.1 (Entität <c>stakeholder_assessments</c>).
/// </summary>
/// <remarks>
/// US-027 (StakeholderAssessment-Aggregate): <see cref="Create"/> ist der vorgesehene Weg, ein
/// neues Assessment fachlich korrekt anzulegen; <see cref="Update"/> ist der einzige Weg, die
/// Werte zu ändern. Der öffentliche Konstruktor bleibt zusätzlich bestehen — er wird von EF Core
/// zur Rematerialisierung aus der Datenbank verwendet (Parameterbindung nach Property-Namen),
/// analog zu <see cref="Stakeholders.Stakeholder"/> (US-020). <see cref="Version"/> ist gemäß
/// <c>docs/adr/0002-optimistic-concurrency-assessment-version.md</c> das gewählte
/// Optimistic-Concurrency-Feld — siehe auch
/// <c>docs/adr/0001-domain-entity-skeletons-vor-aggregate-stories.md</c>.
/// </remarks>
public sealed class StakeholderAssessment
{
    /// <summary>Nur perspektiv-tragende Rollen dürfen ein Assessment erhalten (PRD Abschnitt 2.1) —
    /// <see cref="ProjectRole.User"/> ausdrücklich nicht.</summary>
    private static readonly ProjectRole[] PerspectiveBearingRoles =
    {
        ProjectRole.PL,
        ProjectRole.Coreteam,
        ProjectRole.Architect,
    };

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

    /// <summary>Optimistic-Concurrency-Token, siehe ADR 0002. Wird von <see cref="Update"/> bei
    /// jeder erfolgreichen Änderung erhöht.</summary>
    public int Version { get; private set; }

    /// <summary>Erzeugt ein neues Assessment für einen Stakeholder und eine perspektiv-tragende
    /// Rolle (Akzeptanzkriterium 1). Die eindeutige (<c>stakeholder_id</c>, <c>role</c>)-Kombination
    /// (höchstens ein Assessment je Stakeholder+Rolle, PRD Abschnitt 4.3 Punkt 1) wird nicht hier,
    /// sondern über den Unique-Index auf DB-Ebene sowie die Application-Schicht (Prüfung vor
    /// <see cref="Create"/>, analog zu <see cref="Stakeholders.Stakeholder"/>-Namensduplikaten)
    /// sichergestellt — ein Aggregate kennt seine Geschwister nicht.</summary>
    /// <exception cref="InvalidAssessmentRoleError"><paramref name="role"/> ist keine
    /// perspektiv-tragende Rolle (nicht <c>PL</c>/<c>Coreteam</c>/<c>Architect</c>).</exception>
    /// <exception cref="InvalidScoreRangeError"><paramref name="influence"/> oder
    /// <paramref name="interest"/> liegt außerhalb von 0–100.</exception>
    public static StakeholderAssessment Create(
        Guid stakeholderId,
        ProjectRole role,
        int influence,
        int interest,
        string? notes,
        Guid updatedBy)
    {
        if (!PerspectiveBearingRoles.Contains(role))
        {
            throw new InvalidAssessmentRoleError(role);
        }

        return new StakeholderAssessment(
            Guid.NewGuid(),
            stakeholderId,
            role,
            new Score(influence),
            new Score(interest),
            notes,
            updatedBy,
            DateTimeOffset.UtcNow);
    }

    /// <summary>Aktualisiert Einfluss-/Interesse-Wert sowie Notizen und setzt
    /// <see cref="UpdatedBy"/>/<see cref="UpdatedAt"/> (Akzeptanzkriterium 3). Die Rolle bleibt
    /// unveränderlich — ein Assessment gehört fachlich der Rolle, nicht einem Nutzer, ein
    /// Rollenwechsel wäre ein neues Assessment.</summary>
    /// <param name="expectedVersion">Die vom Aufrufer zuletzt gelesene <see cref="Version"/>
    /// (optimistisches Locking, Akzeptanzkriterium 4, Grundlage für die Konfliktwarnung in
    /// US-028).</param>
    /// <exception cref="StaleAssessmentError"><paramref name="expectedVersion"/> entspricht nicht
    /// der aktuellen <see cref="Version"/> — das Assessment wurde zwischenzeitlich geändert.</exception>
    /// <exception cref="InvalidScoreRangeError"><paramref name="influence"/> oder
    /// <paramref name="interest"/> liegt außerhalb von 0–100.</exception>
    public void Update(int influence, int interest, string? notes, Guid updatedBy, int expectedVersion)
    {
        if (expectedVersion != Version)
        {
            throw new StaleAssessmentError(expectedVersion, Version);
        }

        Influence = new Score(influence);
        Interest = new Score(interest);
        Notes = notes;
        UpdatedBy = updatedBy;
        UpdatedAt = DateTimeOffset.UtcNow;
        Version++;
    }
}
