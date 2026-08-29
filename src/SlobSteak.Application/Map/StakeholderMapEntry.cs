using SlobSteak.Domain.Shared.ValueObjects;

namespace SlobSteak.Application.Map;

/// <summary>Ein Punkt der Stakeholder-Map für eine gewählte Perspektive (US-031
/// Akzeptanzkriterium 1): ein aktiver Stakeholder mit Assessment in genau dieser Perspektive.
/// Stakeholder ohne Assessment in der gewählten Perspektive erzeugen keinen Eintrag (Akzeptanz-
/// kriterium 2) — dieser Typ transportiert daher bewusst keinen "unbewertet"-Status, anders als
/// <see cref="SlobSteak.Application.Assessments.AssessmentRoleItem"/> auf der Detailseite
/// (US-028).</summary>
public sealed record StakeholderMapEntry(Guid StakeholderId, string Name, Score Influence, Score Interest);
