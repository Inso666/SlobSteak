using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Application.DistributionLists;

/// <summary>Ein Eintrag der Verteilerliste (US-041): genau eine Kommunikationszuordnung eines
/// aktiven Stakeholders, angereichert um den zum Abfragezeitpunkt aktuellen Namen der referenzierten
/// Kommunikationsart (Cross-Bounded-Context-Auflösung, analog zu
/// <see cref="Stakeholders.CommunicationAssignmentItem"/>, US-040). Ein Stakeholder mit mehreren
/// Kommunikationszuordnungen erzeugt entsprechend mehrere Einträge — die Verteilerliste ist bewusst
/// ein Read-Modell über <c>Stakeholder</c> × <c>StakeholderCommunicationAssignment</c> (Story-Datei
/// US-041 Abschnitt 2 „Read-Modell über Stakeholder + StakeholderCommunicationAssignment“), nicht
/// eine reine Stakeholderliste: Zweck des Features ist laut PRD F4.1 die Empfängerermittlung für
/// eine konkrete Kommunikation, ein Stakeholder ohne (zum Filter passende) Kommunikationszuordnung
/// ist kein Empfänger und daher nicht Teil des Ergebnisses (siehe „Anmerkungen des Agenten“ in der
/// Story-Datei für die ausführliche Begründung dieser Interpretation).</summary>
public sealed record DistributionListEntry(
    Guid StakeholderId,
    string StakeholderName,
    StakeholderType StakeholderType,
    bool HasEmail,
    string? Email,
    Guid CommunicationTypeId,
    string CommunicationTypeName,
    CommunicationFrequency Frequency,
    CommunicationChannel Channel);
