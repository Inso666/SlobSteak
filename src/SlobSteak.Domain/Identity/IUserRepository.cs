using SlobSteak.Domain.Shared.ValueObjects;

namespace SlobSteak.Domain.Identity;

/// <summary>
/// Repository-Abstraktion für das <see cref="User"/>-Aggregate (Bounded Context IdentityAccess).
/// Persistenzdetails (EF Core, Tabelle <c>users</c>) liegen ausschließlich in der
/// Infrastructure-Implementierung; die Domain und Application kennen nur dieses Interface
/// (CLAUDE.md Abschnitt 3.1).
/// </summary>
public interface IUserRepository
{
    /// <summary>Lädt einen <see cref="User"/> anhand seiner Id, oder <c>null</c>, falls keiner
    /// existiert.</summary>
    Task<User?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Lädt einen <see cref="User"/> anhand seiner (instanzweit eindeutigen) E-Mail-Adresse,
    /// oder <c>null</c>, falls keiner existiert.</summary>
    Task<User?> FindByEmailAsync(Email email, CancellationToken cancellationToken = default);

    /// <summary>Legt einen neuen <see cref="User"/> an oder aktualisiert einen bestehenden.</summary>
    Task SaveAsync(User user, CancellationToken cancellationToken = default);

    /// <summary>Prüft, ob bereits ein Nutzerkonto mit dieser E-Mail-Adresse existiert (Grundlage
    /// der Eindeutigkeits-Invariante zusätzlich zum DB Unique Constraint aus US-003).</summary>
    Task<bool> ExistsByEmailAsync(Email email, CancellationToken cancellationToken = default);

    /// <summary>Prüft, ob überhaupt mindestens ein Nutzerkonto existiert — Grundlage der
    /// Seed-Admin-Bootstrap-Entscheidung (US-005: Seed läuft ausschließlich, wenn die
    /// <c>users</c>-Tabelle leer ist).</summary>
    Task<bool> AnyAsync(CancellationToken cancellationToken = default);
}
