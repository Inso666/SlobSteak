# Use Case: UC-[NUMMER] - [TITEL]

## 1. Ziel & Kontext
- **Akteur**: [z. B. Anonymer Besucher, Registrierter Kunde, Admin]
- **Ziel**: [Was möchte der Akteur erreichen?]
- **Bounded Context**: [z.B. UserManagement, Billing, Inventory]

## 2. Fachlicher Ablauf (Main Flow)
1. Der Akteur [macht Aktion X mit Daten Y].
2. Das System validiert [Bedingung A].
3. Das System führt [Geschäftslogik B] aus und speichert den Zustand.
4. Das System gibt [Ergebnis C] zurück.

## 3. Invarianten & Regeln (DDD Constraints)
- [Regel 1: E-Mail-Adresse muss eindeutig sein]
- [Regel 2: Passwort muss mindestens 8 Zeichen lang sein]
- [Regel 3: Bei Registrierung wird ein `UserRegisteredDomainEvent` geworfen]

## 4. Alternativ- & Fehlerabläufe (Exception Flows)
- **2a. Validation Failure**: Das System bricht ab und liefert HTTP 400 mit lesbarer Fehlermeldung.
- **3a. Duplikat**: Wenn E-Mail bereits existiert, breche ab mit Fehler "EMAIL_ALREADY_IN_USE".

## 5. API / Interface Vorgabe (Optional)
- **Endpoint**: `POST /api/v1/users/register`
- **Response**: `201 Created` mit `UserId`