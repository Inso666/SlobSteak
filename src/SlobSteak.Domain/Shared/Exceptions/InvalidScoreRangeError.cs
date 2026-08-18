namespace SlobSteak.Domain.Shared.Exceptions;

/// <summary>
/// Wird ausgelöst, wenn ein für das Value Object <see cref="ValueObjects.Score"/> übergebener
/// Wert außerhalb des zulässigen Bereichs 0–100 (inklusive) liegt.
/// </summary>
public sealed class InvalidScoreRangeError : DomainException
{
    public InvalidScoreRangeError(int invalidValue)
        : base($"'{invalidValue}' liegt außerhalb des zulässigen Score-Bereichs von 0 bis 100.")
    {
        InvalidValue = invalidValue;
    }

    public int InvalidValue { get; }
}
