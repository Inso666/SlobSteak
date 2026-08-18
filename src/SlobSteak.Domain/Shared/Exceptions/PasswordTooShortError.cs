namespace SlobSteak.Domain.Shared.Exceptions;

/// <summary>
/// Wird ausgelöst, wenn ein für <see cref="Identity.User.Create"/> bzw.
/// <see cref="Identity.User.ChangePassword"/> übergebenes Klartext-Passwort die
/// Mindestlänge unterschreitet.
/// </summary>
public sealed class PasswordTooShortError : DomainException
{
    public const int MinimumLength = 8;

    public PasswordTooShortError()
        : base($"Das Passwort muss mindestens {MinimumLength} Zeichen lang sein.")
    {
    }
}
