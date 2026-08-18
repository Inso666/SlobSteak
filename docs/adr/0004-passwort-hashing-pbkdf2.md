# ADR 0004: Passwort-Hashing mit PBKDF2-HMACSHA256 (BCL) statt bcrypt/argon2-NuGet-Paket

**Status:** Akzeptiert
**Datum:** 2026-08-19
**Kontext-Story:** US-004 (User-Aggregate)

## Kontext

US-004 fordert, dass `User.Create`/`User.ChangePassword` Passwörter ausschließlich gehasht
persistieren; die technischen Hinweise der Story nennen als Beispiel „z. B. bcrypt/argon2“, ohne
einen konkreten Algorithmus oder ein konkretes NuGet-Paket verbindlich vorzugeben. CLAUDE.md
Abschnitt 4 verlangt für solche Library-Entscheidungen, die über die Story hinausgehen, eine
dokumentierte, PRD-konformste Wahl statt einer stillen Annahme.

## Entscheidung

Passwort-Hashing wird über `Rfc2898DeriveBytes.Pbkdf2` (PBKDF2-HMACSHA256, 100.000 Iterationen,
16 Byte Salt, 32 Byte Hash, konstantzeitiger Vergleich via `CryptographicOperations.FixedTimeEquals`)
implementiert — vollständig aus der .NET-Basisklassenbibliothek (`System.Security.Cryptography`),
ohne zusätzliches NuGet-Paket (`BCrypt.Net-Next`, `Konscious.Security.Cryptography.Argon2` o. Ä.).
Das Hash-Format (`Iterationen.Salt.Hash`, Base64) kapselt alle für die Verifikation nötigen
Parameter, sodass die Iterationszahl künftig ohne Breaking Change erhöht werden kann.

PBKDF2-HMACSHA256 ist ein von NIST SP 800-63B empfohlener Algorithmus für Passwort-Hashing und
damit eine PRD-konforme, sicherheitsseitig gleichwertige Alternative zu bcrypt/argon2 (beide vom
PRD nur als Beispiel, nicht als Vorgabe genannt).

## Konsequenzen

- Positiv: Keine zusätzliche Abhängigkeit, kein Risiko einer nativen/unmanaged Bibliothek
  (bcrypt-Implementierungen für .NET sind meist Community-Pakete ohne offiziellen Microsoft-Support;
  Argon2-Pakete benötigen teils native Bindings), reduziert Angriffsfläche und Lizenzprüfaufwand.
- Negativ/Trade-off: PBKDF2 ist speicherseitig weniger resistent gegen GPU-/ASIC-gestützte
  Brute-Force-Angriffe als Argon2id. Für den MVP-Kontext (interne Stakeholder-Management-Anwendung,
  keine öffentliche Registrierung, PRD Abschnitt 1.5 „kein Cloud-Zwang“/On-Prem-Charakter) wird dies
  als akzeptabel bewertet. Eine spätere Migration auf Argon2id ist möglich, ohne bestehende Hashes
  ungültig zu machen (Format enthält Metadaten, `PasswordHasher` ist intern gekapselt und nirgends
  außerhalb von `User` referenziert).
