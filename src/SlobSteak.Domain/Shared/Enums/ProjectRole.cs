namespace SlobSteak.Domain.Shared.Enums;

/// <summary>
/// Projektbezogene Rolle einer <c>ProjectMembership</c>. <c>Admin</c> ist bewusst kein Wert
/// dieses Enums: Admin ist gemäß PRD Abschnitt 2.1/4.1 eine instanzweite Systemrolle
/// (<c>users.is_system_admin</c>), keine projektbezogene Rolle.
/// </summary>
public enum ProjectRole
{
    /// <summary>Projektleiter — perspektiv-tragende Rolle.</summary>
    PL,

    /// <summary>Coreteam-Mitglied — perspektiv-tragende Rolle.</summary>
    Coreteam,

    /// <summary>Architekt — perspektiv-tragende Rolle.</summary>
    Architect,

    /// <summary>Reine Leseperspektive ohne eigenes Assessment.</summary>
    User,
}
