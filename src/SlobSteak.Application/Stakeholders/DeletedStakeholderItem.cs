using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Stakeholders;

/// <summary>Ein Eintrag der Papierkorb-Ansicht (US-024) mit aufgelöstem <see cref="DeletedByName"/>
/// (Akzeptanzkriterium 1) sowie — analog zu <see cref="StakeholderListItem"/> — aufgelöstem
/// <see cref="UpdatedByName"/>, damit die Papierkorb-Ansicht denselben <c>StakeholderResponse</c>-
/// Contract wie die Standardliste (US-025) teilt.</summary>
public sealed record DeletedStakeholderItem(Stakeholder Stakeholder, string UpdatedByName, string DeletedByName);
