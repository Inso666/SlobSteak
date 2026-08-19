namespace SlobSteak.Domain.Shared.Exceptions;

/// <summary>
/// Wird ausgelöst, wenn für <see cref="Stakeholders.Stakeholder.Create"/> ein leerer oder nur aus
/// Leerzeichen bestehender Name übergeben wird.
/// </summary>
public sealed class StakeholderNameRequiredError : DomainException
{
    public StakeholderNameRequiredError()
        : base("Der Stakeholder-Name darf nicht leer sein.")
    {
    }
}
