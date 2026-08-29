using SlobSteak.Domain.Shared.ValueObjects;

namespace SlobSteak.Application.Map;

/// <summary>Ein Punkt der Werte-Paarung zweier Perspektiven für den Vergleichsmodus (US-033
/// Akzeptanzkriterium 1): ein Stakeholder mit Assessment in mindestens einer der beiden gewählten
/// Rollen <c>primary</c>/<c>secondary</c>. Fehlt das Assessment in einer der beiden Perspektiven,
/// ist das jeweilige Feld <c>null</c> — anders als <see cref="StakeholderMapEntry"/> (US-031)
/// transportiert dieser Typ daher bewusst einen "unbewertet in dieser Perspektive"-Zustand.</summary>
public sealed record StakeholderMapComparisonEntry(
    Guid StakeholderId,
    string Name,
    StakeholderMapComparisonValue? Primary,
    StakeholderMapComparisonValue? Secondary);

/// <summary>Einfluss-/Interesse-Werte einer einzelnen Perspektive innerhalb eines
/// <see cref="StakeholderMapComparisonEntry"/>.</summary>
public sealed record StakeholderMapComparisonValue(Score Influence, Score Interest);
