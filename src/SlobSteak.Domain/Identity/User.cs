using SlobSteak.Domain.Shared.ValueObjects;

namespace SlobSteak.Domain.Identity;

/// <summary>
/// Aggregate Root für ein Nutzerkonto (Bounded Context IdentityAccess), Felder gemäß PRD
/// Abschnitt 4.1 (Entität <c>users</c>).
/// </summary>
/// <remarks>
/// Bewusst minimales Skeleton im Rahmen von US-003 (Datenbankschema): Dieser Konstruktor prüft
/// nur strukturelle Grundbedingungen (keine leeren Pflichtfelder), aber keine fachlichen
/// Invarianten. Passwort-Hashing, <c>Create</c>-Factory-Methode mit
/// <c>PasswordTooShortError</c>/<c>InvalidEmailFormatError</c>, <c>ChangePassword</c>,
/// <c>VerifyPassword</c> sowie das Repository-Interface <c>IUserRepository</c> werden erst in
/// US-004 (User-Aggregate) ergänzt — siehe
/// <c>docs/adr/0001-domain-entity-skeletons-vor-aggregate-stories.md</c>.
/// </remarks>
public sealed class User
{
    public User(
        Guid id,
        string name,
        Email email,
        string passwordHash,
        bool isSystemAdmin,
        bool mustChangePassword,
        DateTimeOffset createdAt)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Name darf nicht leer sein.", nameof(name));
        }

        if (string.IsNullOrWhiteSpace(passwordHash))
        {
            throw new ArgumentException("PasswordHash darf nicht leer sein.", nameof(passwordHash));
        }

        Id = id;
        Name = name;
        Email = email ?? throw new ArgumentNullException(nameof(email));
        PasswordHash = passwordHash;
        IsSystemAdmin = isSystemAdmin;
        MustChangePassword = mustChangePassword;
        CreatedAt = createdAt;
    }

    public Guid Id { get; private set; }

    public string Name { get; private set; }

    public Email Email { get; private set; }

    public string PasswordHash { get; private set; }

    /// <summary>Instanzweite Systemrolle, unabhängig von Projektzuweisungen (PRD Abschnitt 2.1).</summary>
    public bool IsSystemAdmin { get; private set; }

    /// <summary><c>true</c> nach Seed/Reset, bis der Nutzer sein Passwort selbst geändert hat.</summary>
    public bool MustChangePassword { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }
}
