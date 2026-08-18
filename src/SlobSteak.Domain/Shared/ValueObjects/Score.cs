using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Domain.Shared.ValueObjects;

/// <summary>
/// Value Object für einen Einfluss-/Interesse-Wert im Bereich 0–100 (inklusive), wie er von
/// <c>StakeholderAssessment</c> verwendet wird. Unveränderlich (<c>readonly record struct</c>);
/// strukturelle Gleichheit (<c>==</c>) ergibt sich automatisch aus der <c>record</c>-Semantik.
/// Werte außerhalb des Bereichs werden bereits bei der Erzeugung mit
/// <see cref="InvalidScoreRangeError"/> abgelehnt.
/// </summary>
public readonly record struct Score
{
    public const int MinValue = 0;
    public const int MaxValue = 100;

    public int Value { get; }

    public Score(int value)
    {
        if (value < MinValue || value > MaxValue)
        {
            throw new InvalidScoreRangeError(value);
        }

        Value = value;
    }

    public override string ToString() => Value.ToString();
}
