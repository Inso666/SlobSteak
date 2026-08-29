namespace SlobSteak.Domain.Shared.Exceptions;

/// <summary>
/// Wird ausgelöst, wenn für <see cref="Communications.CommunicationType.Create"/> oder
/// <see cref="Communications.CommunicationType.Rename"/> ein leerer oder nur aus Leerzeichen
/// bestehender Name übergeben wird.
/// </summary>
public sealed class CommunicationTypeNameRequiredError : DomainException
{
    public CommunicationTypeNameRequiredError()
        : base("Der Name der Kommunikationsart darf nicht leer sein.")
    {
    }
}
