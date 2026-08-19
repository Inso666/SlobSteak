using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Stakeholders;

/// <summary>Ergebnis von <see cref="UpdateStakeholderDetailsService.UpdateStakeholderDetailsAsync"/>
/// (US-022). <see cref="UpdatedByName"/> ist der aufgelöste Name des Nutzers, der die Änderung
/// vorgenommen hat (US-022 Akzeptanzkriterium 4: „Zuletzt geändert von [Name] am [Datum/Uhrzeit]“)
/// — <see cref="Stakeholder.UpdatedBy"/> kennt nur die rohe <c>UserId</c> (Bounded-Context-Grenze
/// zu IdentityAccess, CLAUDE.md Abschnitt 3.1).</summary>
public sealed record UpdateStakeholderDetailsResult(Stakeholder Stakeholder, string UpdatedByName);
