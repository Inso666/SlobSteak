namespace SlobSteak.Domain.Shared.Exceptions;

/// <summary>
/// Basisklasse für alle Ausnahmen, die eine Verletzung einer fachlichen Invariante der Domain
/// signalisieren (im Unterschied zu technischen/infrastrukturellen Fehlern). Wird zentral in
/// <c>SlobSteak.Api</c> über eine Exception-Middleware auf passende HTTP-Statuscodes
/// (<c>ProblemDetails</c>) abgebildet, statt in jedem Controller einzeln behandelt zu werden.
/// </summary>
public abstract class DomainException : Exception
{
    protected DomainException(string message)
        : base(message)
    {
    }
}
