namespace SlobSteak.Application.Identity;

/// <summary>
/// Wird beim Anwendungsstart geworfen, wenn noch kein Nutzerkonto existiert und die für den
/// Seed-Admin-Bootstrap (US-005) erforderlichen Umgebungsvariablen <c>SEED_ADMIN_EMAIL</c>/
/// <c>SEED_ADMIN_PASSWORD</c> fehlen. Bewusst keine <see cref="SlobSteak.Domain.Shared.Exceptions.DomainException"/>-
/// Ableitung: Es handelt sich um einen technischen Konfigurationsfehler beim Bootstrap, nicht um
/// die Verletzung einer fachlichen Invariante eines Aggregates.
/// </summary>
public sealed class SeedAdminConfigurationMissingException : Exception
{
    public SeedAdminConfigurationMissingException(string message)
        : base(message)
    {
    }
}
