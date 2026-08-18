namespace SlobSteak.Domain.Shared.Exceptions;

/// <summary>
/// Wird ausgelöst, wenn ein für das Value Object <see cref="ValueObjects.Email"/> übergebener
/// Wert kein gültiges E-Mail-Format aufweist.
/// </summary>
public sealed class InvalidEmailFormatError : DomainException
{
    public InvalidEmailFormatError(string invalidValue)
        : base($"'{invalidValue}' ist kein gültiges E-Mail-Format.")
    {
        InvalidValue = invalidValue;
    }

    public string InvalidValue { get; }
}
