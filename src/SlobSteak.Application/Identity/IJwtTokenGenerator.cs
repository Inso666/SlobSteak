namespace SlobSteak.Application.Identity;

/// <summary>
/// Ausgehender Port (US-006) für die Ausstellung von Session-Tokens beim Login. Die konkrete
/// Implementierung (JWT-Signierung) liegt in der Composition Root <c>SlobSteak.Api</c>, da
/// <c>SlobSteak.Application</c> laut CLAUDE.md Abschnitt 3.1 ausschließlich
/// <c>SlobSteak.Domain</c> referenziert und daher keine konkrete Token-Bibliothek einbinden darf.
/// </summary>
public interface IJwtTokenGenerator
{
    /// <summary>Erzeugt ein signiertes Token, das ausschließlich <paramref name="userId"/> (Claim
    /// <c>sub</c>) und <paramref name="isSystemAdmin"/> (Claim <c>isSystemAdmin</c>) trägt —
    /// bewusst keine projektbezogenen Rollen, siehe US-006 Akzeptanzkriterium 4.</summary>
    string GenerateToken(Guid userId, bool isSystemAdmin);
}
