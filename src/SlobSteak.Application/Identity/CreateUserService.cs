using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Shared.ValueObjects;

namespace SlobSteak.Application.Identity;

/// <summary>
/// Application Service (US-012): legt ein neues Nutzerkonto an — ausschließlich über diesen
/// Admin-Weg möglich, keine Selbstregistrierung (PRD Abschnitt 1.4). Orchestriert nur den Use
/// Case; die eigentliche Konto-Erzeugung (inkl. Passwort-Hashing, <c>MustChangePassword = true</c>)
/// liegt in <see cref="User.Create"/>.
/// </summary>
public sealed class CreateUserService
{
    private readonly IUserRepository _userRepository;

    public CreateUserService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    /// <exception cref="Shared.Exceptions.InvalidEmailFormatError"><paramref name="email"/> ist
    /// kein gültiges Format.</exception>
    /// <exception cref="Shared.Exceptions.PasswordTooShortError"><paramref name="initialPassword"/>
    /// hat weniger als 8 Zeichen.</exception>
    /// <exception cref="EmailAlreadyInUseError">Es existiert bereits ein Nutzer mit dieser
    /// E-Mail-Adresse — proaktiv geprüft, zusätzlich als zweite Verteidigungslinie durch den
    /// DB-Unique-Index bei parallelem Zugriff abgesichert (Infrastructure-Implementierung von
    /// <see cref="IUserRepository"/>).</exception>
    public async Task<User> CreateUserAsync(string name, string email, string initialPassword, CancellationToken cancellationToken = default)
    {
        var emailValueObject = new Email(email);

        if (await _userRepository.ExistsByEmailAsync(emailValueObject, cancellationToken))
        {
            throw new EmailAlreadyInUseError(email);
        }

        var user = User.Create(name, email, initialPassword);
        await _userRepository.SaveAsync(user, cancellationToken);
        return user;
    }
}
