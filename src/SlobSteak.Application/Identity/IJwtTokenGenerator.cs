namespace SlobSteak.Application.Identity;

/// <summary>
/// Ausgehender Port (US-006) für die Ausstellung von Session-Tokens beim Login. Die konkrete
/// Implementierung (JWT-Signierung) liegt in der Composition Root <c>SlobSteak.Api</c>, da
/// <c>SlobSteak.Application</c> laut CLAUDE.md Abschnitt 3.1 ausschließlich
/// <c>SlobSteak.Domain</c> referenziert und daher keine konkrete Token-Bibliothek einbinden darf.
/// </summary>
public interface IJwtTokenGenerator
{
    /// <summary>Erzeugt ein signiertes Token mit <paramref name="userId"/> (Claim <c>sub</c>) und
    /// <paramref name="isSystemAdmin"/> (Claim <c>isSystemAdmin</c>) — bewusst keine
    /// projektbezogenen Rollen, siehe US-006 Akzeptanzkriterium 4.</summary>
    /// <param name="name">US-074: der angemeldete Anzeigename (<c>User.Name</c>), als Claim
    /// <c>name</c> eingebettet. Optionaler Parameter mit Default <c>null</c> (Claim entfällt dann),
    /// damit bestehende Aufrufstellen (insbesondere Test-Helper, die Tokens ohne Anzeigenamen
    /// bauen) unverändert kompilieren — siehe Story „Anmerkungen des Agenten": die Sidebar-Nutzerkarte
    /// (US-074 Akzeptanzkriterium „Nutzerkarte") benötigt einen Namen, ohne dass die Login-Response
    /// (<c>AuthController.LoginResponse</c>) oder ein zusätzlicher Backend-Request eingeführt werden
    /// muss — der Name reist im ohnehin bereits ausgestellten Session-Token mit.</param>
    string GenerateToken(Guid userId, bool isSystemAdmin, string? name = null);
}
