using SlobSteak.Domain.Identity;

namespace SlobSteak.Application.Identity;

/// <summary>
/// Application Service (US-013): setzt im Admin-Auftrag ein temporäres Passwort für einen
/// bestehenden Nutzer — kein Self-Service-Reset im MVP (PRD Abschnitt 1.4, F6.2). Orchestriert nur
/// den Use Case; die eigentliche Regel (neues Passwort erzwingt Wechsel beim nächsten Login) liegt
/// in <see cref="User.ResetPassword"/>.
/// </summary>
public sealed class ResetPasswordService
{
    private readonly IUserRepository _userRepository;

    public ResetPasswordService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    /// <summary>Setzt das Passwort von <paramref name="userId"/> zurück. Liefert <c>false</c>,
    /// wenn kein Nutzer mit dieser Id existiert.</summary>
    /// <exception cref="Shared.Exceptions.PasswordTooShortError"><paramref name="temporaryPassword"/>
    /// hat weniger als 8 Zeichen.</exception>
    public async Task<bool> ResetPasswordAsync(Guid userId, string temporaryPassword, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.FindByIdAsync(userId, cancellationToken);
        if (user is null)
        {
            return false;
        }

        user.ResetPassword(temporaryPassword);
        await _userRepository.SaveAsync(user, cancellationToken);
        return true;
    }
}
