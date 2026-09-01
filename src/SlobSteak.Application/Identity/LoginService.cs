using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Shared.ValueObjects;

namespace SlobSteak.Application.Identity;

/// <summary>
/// Erfolgreiches Login-Ergebnis (US-006): das ausgestellte Session-Token sowie das
/// <c>MustChangePassword</c>-Flag des Nutzers, das die Api-Schicht in der Response spiegelt.
/// </summary>
public sealed record LoginResult(string Token, bool MustChangePassword);

/// <summary>
/// Application Service (US-006): prüft E-Mail/Passwort gegen ein bestehendes Nutzerkonto und
/// stellt bei Erfolg ein Session-Token aus. Enthält keine Geschäftsregeln (die liegen im
/// <see cref="User"/>-Aggregate, insbesondere <see cref="User.VerifyPassword"/>) — orchestriert
/// nur den Use Case.
/// </summary>
public sealed class LoginService
{
    private readonly IUserRepository _userRepository;
    private readonly IJwtTokenGenerator _tokenGenerator;

    public LoginService(IUserRepository userRepository, IJwtTokenGenerator tokenGenerator)
    {
        _userRepository = userRepository;
        _tokenGenerator = tokenGenerator;
    }

    /// <summary>
    /// Liefert bei gültigen Zugangsdaten ein <see cref="LoginResult"/>, sonst <c>null</c> — sowohl
    /// bei unbekannter E-Mail als auch bei falschem Passwort identisch <c>null</c>, damit die
    /// Api-Schicht in beiden Fällen dieselbe generische Fehlermeldung ausgibt (Schutz vor
    /// User-Enumeration, US-006 Akzeptanzkriterium 2).
    /// </summary>
    public async Task<LoginResult?> LoginAsync(string email, string password, CancellationToken cancellationToken = default)
    {
        Email emailValueObject;
        try
        {
            emailValueObject = new Email(email);
        }
        catch (InvalidEmailFormatError)
        {
            return null;
        }

        var user = await _userRepository.FindByEmailAsync(emailValueObject, cancellationToken);
        if (user is null || !user.VerifyPassword(password))
        {
            return null;
        }

        // US-074: Anzeigename mit ausstellen, damit die Sidebar-Nutzerkarte im Frontend ohne
        // zusätzlichen Backend-Request auskommt (siehe IJwtTokenGenerator-Dokumentation).
        var token = _tokenGenerator.GenerateToken(user.Id, user.IsSystemAdmin, user.Name);
        return new LoginResult(token, user.MustChangePassword);
    }
}
