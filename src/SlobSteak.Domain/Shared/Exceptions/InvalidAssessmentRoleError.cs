using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Domain.Shared.Exceptions;

/// <summary>
/// Wird ausgelöst, wenn für <see cref="Assessments.StakeholderAssessment.Create"/> eine Rolle
/// übergeben wird, die fachlich keine perspektiv-tragende Rolle ist (PRD Abschnitt 2.1) — also
/// insbesondere <see cref="ProjectRole.User"/>. Ein Assessment gehört stets einer Rolle, nie einem
/// einzelnen Nutzer (PRD F2 Grundprinzip).
/// </summary>
public sealed class InvalidAssessmentRoleError : DomainException
{
    public InvalidAssessmentRoleError(ProjectRole role)
        : base($"Rolle '{role}' ist keine perspektiv-tragende Rolle und kann kein Assessment erhalten.")
    {
        Role = role;
    }

    public ProjectRole Role { get; }
}
