using SlobSteak.Domain.Identity;

namespace SlobSteak.Application.Identity;

/// <summary>
/// Application Service (US-008): ändert das Passwort eines bereits authentifizierten Nutzers.
/// Orchestriert nur den Use Case — die eigentliche Validierung (Mindestlänge) und das Zurücksetzen
/// von <see cref="User.MustChangePassword"/> liegen in <see cref="User.ChangePassword"/>.
/// </summary>
public sealed class ChangePasswordService
{
    private readonly IUserRepository _userRepository;

    public ChangePasswordService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    /// <summary>Ändert das Passwort von <paramref name="userId"/>. Liefert <c>false</c>, wenn kein
    /// Nutzer mit dieser Id existiert (z. B. gelöschter/ungültiger Token-Inhaber).</summary>
    /// <exception cref="Shared.Exceptions.PasswordTooShortError"><paramref name="newPassword"/> hat
    /// weniger als 8 Zeichen.</exception>
    public async Task<bool> ChangePasswordAsync(Guid userId, string newPassword, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.FindByIdAsync(userId, cancellationToken);
        if (user is null)
        {
            return false;
        }

        user.ChangePassword(newPassword);
        await _userRepository.SaveAsync(user, cancellationToken);
        return true;
    }
}
