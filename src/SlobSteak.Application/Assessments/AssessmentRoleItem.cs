using SlobSteak.Domain.Assessments;
using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Application.Assessments;

/// <summary>Status eines Assessment-Rollensegments für einen Stakeholder (US-028
/// Akzeptanzkriterium 5/6).</summary>
public enum AssessmentRoleStatus
{
    /// <summary>Die Rolle hat für diesen Stakeholder ein Assessment eingetragen.</summary>
    Assessed,

    /// <summary>Die Rolle ist im Projekt zugewiesen, hat aber noch kein Assessment eingetragen.</summary>
    NotAssessed,

    /// <summary>Dem Projekt ist aktuell kein Nutzer mit dieser Rolle zugewiesen (F2.1 Edge Case).</summary>
    NoRoleAssigned,
}

/// <summary>Ein Eintrag der Assessment-Übersicht eines Stakeholders (US-028 Akzeptanzkriterium 5) —
/// je perspektiv-tragender Rolle genau ein Eintrag, unabhängig davon, ob ein Assessment existiert.
/// <see cref="Assessment"/>/<see cref="UpdatedByName"/> sind nur bei <see cref="AssessmentRoleStatus.Assessed"/>
/// gesetzt.</summary>
public sealed record AssessmentRoleItem(ProjectRole Role, AssessmentRoleStatus Status, StakeholderAssessment? Assessment, string? UpdatedByName);
