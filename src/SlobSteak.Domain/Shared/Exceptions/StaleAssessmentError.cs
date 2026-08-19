namespace SlobSteak.Domain.Shared.Exceptions;

/// <summary>
/// Wird ausgelöst, wenn <see cref="Assessments.StakeholderAssessment.Update"/> mit einer
/// <c>expectedVersion</c> aufgerufen wird, die nicht der aktuell persistierten
/// <see cref="Assessments.StakeholderAssessment.Version"/> entspricht — das Assessment wurde
/// zwischenzeitlich von einem anderen Nutzer geändert (Grundlage für die Konfliktwarnung in
/// US-028, siehe auch <c>docs/adr/0002-optimistic-concurrency-assessment-version.md</c>).
/// </summary>
public sealed class StaleAssessmentError : DomainException
{
    public StaleAssessmentError(int expectedVersion, int actualVersion)
        : base($"Das Assessment wurde zwischenzeitlich geändert (erwartete Version {expectedVersion}, aktuelle Version {actualVersion}).")
    {
        ExpectedVersion = expectedVersion;
        ActualVersion = actualVersion;
    }

    public int ExpectedVersion { get; }

    public int ActualVersion { get; }
}
