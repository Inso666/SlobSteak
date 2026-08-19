using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Stakeholders;

/// <summary>Ergebnis von <see cref="CreateStakeholderService.CreateStakeholderAsync"/> (US-021).
/// <see cref="SimilarStakeholderWarning"/> ist ein rein informativer, nicht-blockierender Hinweis
/// (US-021 Akzeptanzkriterium 4) — das Anlegen selbst ist bereits erfolgt.</summary>
public sealed record CreateStakeholderResult(Stakeholder Stakeholder, SimilarStakeholderWarning? SimilarStakeholderWarning);

/// <summary>Verweis auf einen bereits existierenden Stakeholder mit ähnlichem/identischem Namen
/// im selben Projekt (US-021 Akzeptanzkriterium 4, PRD Abschnitt 4.3).</summary>
public sealed record SimilarStakeholderWarning(Guid Id, string Name);
