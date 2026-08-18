namespace SlobSteak.Domain.Shared.Exceptions;

/// <summary>
/// Wird ausgelöst, wenn beim Anlegen eines neuen Nutzerkontos (US-012) bereits ein Nutzer mit
/// derselben E-Mail-Adresse existiert.
/// </summary>
public sealed class EmailAlreadyInUseError : DomainException
{
    public EmailAlreadyInUseError(string email)
        : base($"Die E-Mail-Adresse '{email}' wird bereits von einem anderen Nutzerkonto verwendet.")
    {
        Email = email;
    }

    public string Email { get; }
}
