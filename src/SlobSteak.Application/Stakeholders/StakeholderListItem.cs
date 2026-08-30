using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Stakeholders;

/// <summary>Ein Eintrag der Stakeholderliste (US-025) mit aufgelöstem <see cref="UpdatedByName"/>
/// — analog zu <see cref="CreateStakeholderResult"/>/<see cref="UpdateStakeholderDetailsResult"/>,
/// damit die Liste denselben Response-Contract wie Anlegen/Bearbeiten teilt und die Frontend-
/// Bearbeiten-/Löschen-Komponenten unverändert wiederverwendet werden können.
///
/// <see cref="CommunicationTypeNames"/> (US-072, additiv): die Namen der diesem Stakeholder
/// zugeordneten Kommunikationsarten, ausschließlich für die Listen-Anzeige (US-025) und
/// serverseitig nur befüllt für die Rollen <c>PL</c>/<c>Coreteam</c>/<c>Architect</c> —
/// dieselbe Sichtbarkeitsgrenze wie <see cref="ManageStakeholderCommunicationService"/>
/// (US-040). Für Rolle <c>User</c> und jeden Aufrufer, der keine Zuordnungen benötigt (z. B.
/// <see cref="GetStakeholderService"/> für die Detailseite — dort werden Kommunikations-
/// zuordnungen über den dedizierten <c>StakeholderCommunicationController</c>-Endpunkt
/// geladen), bleibt das Feld ein leeres Array.</summary>
public sealed record StakeholderListItem(
    Stakeholder Stakeholder,
    string UpdatedByName,
    IReadOnlyList<string> CommunicationTypeNames)
{
    /// <summary>Kompatibilitäts-Konstruktor für Aufrufer ohne Kommunikationszuordnungen (siehe
    /// <see cref="CommunicationTypeNames"/>) — liefert stets ein leeres Array.</summary>
    public StakeholderListItem(Stakeholder stakeholder, string updatedByName)
        : this(stakeholder, updatedByName, Array.Empty<string>())
    {
    }
}
