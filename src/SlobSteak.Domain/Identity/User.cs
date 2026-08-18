using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Shared.ValueObjects;

namespace SlobSteak.Domain.Identity;

/// <summary>
/// Aggregate Root für ein Nutzerkonto (Bounded Context IdentityAccess), Felder gemäß PRD
/// Abschnitt 4.1 (Entität <c>users</c>).
/// </summary>
/// <remarks>
/// US-004 (User-Aggregate): <see cref="Create"/> ist der einzige vorgesehene Weg, ein neues
/// Nutzerkonto fachlich korrekt anzulegen (gehashtes Passwort, Invarianten geprüft). Der
/// öffentliche Konstruktor bleibt zusätzlich bestehen — er wird von EF Core zur Rematerialisierung
/// aus der Datenbank verwendet (Parameterbindung nach Property-Namen) sowie von
/// Seed-/Bootstrap-Code (z. B. US-005), der explizit einen bereits gehashten Passwort-Wert bzw.
/// <c>IsSystemAdmin = true</c> setzen muss, was <see cref="Create"/> bewusst nicht anbietet.
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

    /// <summary>
    /// Erzeugt ein neues Nutzerkonto mit gehashtem Passwort. Das Klartext-Passwort
    /// (<paramref name="plainPassword"/>) wird nirgends im Aggregate-Zustand gespeichert.
    /// </summary>
    /// <exception cref="InvalidEmailFormatError"><paramref name="email"/> bildet kein gültiges
    /// <see cref="Email"/>-Value-Object (Wiederverwendung von US-002).</exception>
    /// <exception cref="PasswordTooShortError"><paramref name="plainPassword"/> hat weniger als
    /// <see cref="PasswordTooShortError.MinimumLength"/> Zeichen.</exception>
    public static User Create(string name, string email, string plainPassword) =>
        CreateInternal(name, email, plainPassword, isSystemAdmin: false);

    /// <summary>
    /// Erzeugt ein initiales System-Administrator-Konto — ausschließlich für Bootstrap-/Seed-Zwecke
    /// gedacht (US-005 <c>SeedAdminService</c>), nicht für regulär durch einen Admin angelegte
    /// Nutzerkonten (dafür bleibt <see cref="Create"/> maßgeblich). Setzt zusätzlich zu den
    /// Prüfungen aus <see cref="Create"/> <see cref="IsSystemAdmin"/> auf <c>true</c>.
    /// </summary>
    /// <exception cref="InvalidEmailFormatError"><paramref name="email"/> bildet kein gültiges
    /// <see cref="Email"/>-Value-Object.</exception>
    /// <exception cref="PasswordTooShortError"><paramref name="plainPassword"/> hat weniger als
    /// <see cref="PasswordTooShortError.MinimumLength"/> Zeichen.</exception>
    public static User CreateSystemAdmin(string name, string email, string plainPassword) =>
        CreateInternal(name, email, plainPassword, isSystemAdmin: true);

    private static User CreateInternal(string name, string email, string plainPassword, bool isSystemAdmin)
    {
        var emailValueObject = new Email(email);

        if (plainPassword is null || plainPassword.Length < PasswordTooShortError.MinimumLength)
        {
            throw new PasswordTooShortError();
        }

        return new User(
            Guid.NewGuid(),
            name,
            emailValueObject,
            PasswordHasher.Hash(plainPassword),
            isSystemAdmin,
            mustChangePassword: true,
            DateTimeOffset.UtcNow);
    }

    /// <summary>
    /// Setzt ein neues Passwort (gehasht) und markiert den erzwungenen Passwortwechsel
    /// (<see cref="MustChangePassword"/>) als erledigt.
    /// </summary>
    /// <exception cref="PasswordTooShortError"><paramref name="newPlainPassword"/> hat weniger als
    /// <see cref="PasswordTooShortError.MinimumLength"/> Zeichen.</exception>
    public void ChangePassword(string newPlainPassword)
    {
        if (newPlainPassword is null || newPlainPassword.Length < PasswordTooShortError.MinimumLength)
        {
            throw new PasswordTooShortError();
        }

        PasswordHash = PasswordHasher.Hash(newPlainPassword);
        MustChangePassword = false;
    }

    /// <summary>Prüft <paramref name="plainPassword"/> gegen den gespeicherten Hash, ohne diesen
    /// offenzulegen.</summary>
    public bool VerifyPassword(string plainPassword) => PasswordHasher.Verify(plainPassword, PasswordHash);
}
