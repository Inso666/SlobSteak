using System.Security.Cryptography;

namespace SlobSteak.Domain.Identity;

/// <summary>
/// Kapselt sicheres Passwort-Hashing (PBKDF2-HMACSHA256, siehe NIST SP 800-63B) für
/// <see cref="User"/>. Rein technische Hilfsklasse ohne eigene Geschäftsregeln; das
/// Klartext-Passwort verlässt diese Klasse zu keinem Zeitpunkt in gespeicherter Form — es wird
/// ausschließlich der gesalzene Hash zurückgegeben bzw. für den Vergleich herangezogen.
/// </summary>
internal static class PasswordHasher
{
    private const int SaltSizeInBytes = 16;
    private const int HashSizeInBytes = 32;
    private const int Iterations = 100_000;
    private static readonly HashAlgorithmName Algorithm = HashAlgorithmName.SHA256;

    /// <summary>Erzeugt einen neuen, zufällig gesalzenen Hash für <paramref name="plainPassword"/>.
    /// Das Ergebnisformat (<c>Iterationen.Salt.Hash</c>, Base64) enthält alle für
    /// <see cref="Verify"/> benötigten Parameter, sodass die Iterationszahl künftig erhöht werden
    /// kann, ohne bestehende Hashes ungültig zu machen.</summary>
    public static string Hash(string plainPassword)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSizeInBytes);
        var hash = Rfc2898DeriveBytes.Pbkdf2(plainPassword, salt, Iterations, Algorithm, HashSizeInBytes);

        return $"{Iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }

    /// <summary>Prüft <paramref name="plainPassword"/> gegen einen zuvor mit <see cref="Hash"/>
    /// erzeugten Wert, per konstantzeitigem Vergleich (Schutz gegen Timing-Angriffe).</summary>
    public static bool Verify(string plainPassword, string storedHash)
    {
        var parts = storedHash.Split('.', 3);
        if (parts.Length != 3 || !int.TryParse(parts[0], out var iterations))
        {
            return false;
        }

        byte[] salt;
        byte[] expectedHash;
        try
        {
            salt = Convert.FromBase64String(parts[1]);
            expectedHash = Convert.FromBase64String(parts[2]);
        }
        catch (FormatException)
        {
            return false;
        }

        var actualHash = Rfc2898DeriveBytes.Pbkdf2(plainPassword, salt, iterations, Algorithm, expectedHash.Length);

        return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
    }
}
