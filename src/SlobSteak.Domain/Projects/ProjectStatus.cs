namespace SlobSteak.Domain.Projects;

/// <summary>
/// Lebenszyklus-Status eines Projekts (PRD Abschnitt 4.1, Entität <c>projects</c>). Kontextspezifisch
/// für <c>ProjectManagement</c> und daher — anders als die Enums aus US-002 — nicht im Shared
/// Kernel abgelegt, da er in keinem anderen Bounded Context wiederverwendet wird.
/// </summary>
public enum ProjectStatus
{
    Active,
    Archived,
}
