using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Stakeholders;

/// <summary>Ein Eintrag der Stakeholderliste (US-025) mit aufgelöstem <see cref="UpdatedByName"/>
/// — analog zu <see cref="CreateStakeholderResult"/>/<see cref="UpdateStakeholderDetailsResult"/>,
/// damit die Liste denselben Response-Contract wie Anlegen/Bearbeiten teilt und die Frontend-
/// Bearbeiten-/Löschen-Komponenten unverändert wiederverwendet werden können.</summary>
public sealed record StakeholderListItem(Stakeholder Stakeholder, string UpdatedByName);
