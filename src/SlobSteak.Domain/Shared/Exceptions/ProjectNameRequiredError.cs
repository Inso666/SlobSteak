namespace SlobSteak.Domain.Shared.Exceptions;

/// <summary>
/// Wird ausgelöst, wenn für <see cref="Projects.Project.Create"/> ein leerer oder nur aus
/// Leerzeichen bestehender Projektname übergeben wird.
/// </summary>
public sealed class ProjectNameRequiredError : DomainException
{
    public ProjectNameRequiredError()
        : base("Der Projektname darf nicht leer sein.")
    {
    }
}
