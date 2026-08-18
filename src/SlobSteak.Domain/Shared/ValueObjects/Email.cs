using System.Text.RegularExpressions;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Domain.Shared.ValueObjects;

/// <summary>
/// Value Object für eine validierte E-Mail-Adresse. Unveränderlich; strukturelle Gleichheit
/// (<c>==</c>) ergibt sich automatisch aus der <c>record</c>-Semantik. Ungültige Formate werden
/// bereits bei der Erzeugung mit <see cref="InvalidEmailFormatError"/> abgelehnt, sodass kein
/// Aggregate jemals ein <see cref="Email"/> mit ungültigem Wert referenzieren kann.
/// </summary>
public sealed record Email
{
    private static readonly Regex FormatPattern = new(
        @"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public string Value { get; }

    public Email(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || !FormatPattern.IsMatch(value))
        {
            throw new InvalidEmailFormatError(value);
        }

        Value = value;
    }

    public override string ToString() => Value;
}
