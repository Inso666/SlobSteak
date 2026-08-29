namespace SlobSteak.Domain.Shared.Exceptions;

/// <summary>
/// Wird ausgelöst, wenn beim Anlegen (US-037 Akzeptanzkriterium 1) oder Umbenennen
/// (Akzeptanzkriterium 2) eines <see cref="Communications.CommunicationType"/>-Katalogeintrags
/// bereits ein anderer Eintrag mit demselben (instanzweit eindeutigen) Namen existiert.
/// </summary>
public sealed class CommunicationTypeNameAlreadyInUseError : DomainException
{
    public CommunicationTypeNameAlreadyInUseError(string name)
        : base($"Die Kommunikationsart '{name}' existiert bereits im Katalog.")
    {
        Name = name;
    }

    public string Name { get; }
}
