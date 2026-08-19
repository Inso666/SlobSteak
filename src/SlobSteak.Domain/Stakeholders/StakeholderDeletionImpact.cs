namespace SlobSteak.Domain.Stakeholders;

/// <summary>
/// Anzahl der Datensätze, die von einem Soft-Delete eines Stakeholders betroffen wären — nicht im
/// Sinne einer Löschung (Soft-Delete rührt weder Assessments noch Kommunikationszuordnungen an),
/// sondern als Informationsgrundlage für den Bestätigungsdialog vor dem Löschen (US-023
/// Akzeptanzkriterium 2).
/// </summary>
public sealed record StakeholderDeletionImpact(int AssessmentCount, int CommunicationAssignmentCount);
