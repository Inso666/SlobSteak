using SlobSteak.Domain.Communications;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Application.Communications;

/// <summary>
/// Application Service (US-037): aktualisiert einen bestehenden Kommunikationsarten-
/// Katalogeintrag — Umbenennen (Akzeptanzkriterium 2) und/oder Aktivieren/Deaktivieren
/// (Akzeptanzkriterium 3), je nachdem welche der beiden optionalen Parameter gesetzt sind.
/// Orchestriert nur den Use Case; die eigentlichen Regeln liegen im
/// <see cref="CommunicationType"/>-Aggregate.
/// </summary>
public sealed class UpdateCommunicationTypeService
{
    private readonly ICommunicationTypeRepository _communicationTypeRepository;

    public UpdateCommunicationTypeService(ICommunicationTypeRepository communicationTypeRepository)
    {
        _communicationTypeRepository = communicationTypeRepository;
    }

    /// <summary>Liefert <c>null</c>, wenn kein Katalogeintrag mit <paramref name="id"/> existiert.
    /// <paramref name="name"/> und <paramref name="isActive"/> sind unabhängig voneinander optional
    /// — nur gesetzte Werte werden angewendet, ein Aufruf ohne beide ist ein No-Op.</summary>
    /// <exception cref="CommunicationTypeNameRequiredError"><paramref name="name"/> ist gesetzt,
    /// aber leer oder besteht nur aus Leerzeichen.</exception>
    /// <exception cref="CommunicationTypeNameAlreadyInUseError">Es existiert bereits ein anderer
    /// Katalogeintrag mit dem über <paramref name="name"/> gewünschten Namen.</exception>
    public async Task<CommunicationType?> UpdateAsync(
        Guid id,
        string? name,
        bool? isActive,
        CancellationToken cancellationToken = default)
    {
        var communicationType = await _communicationTypeRepository.FindByIdAsync(id, cancellationToken);
        if (communicationType is null)
        {
            return null;
        }

        if (name is not null)
        {
            if (await _communicationTypeRepository.ExistsByNameAsync(name, id, cancellationToken))
            {
                throw new CommunicationTypeNameAlreadyInUseError(name);
            }

            communicationType.Rename(name);
        }

        if (isActive is true)
        {
            communicationType.Activate();
        }
        else if (isActive is false)
        {
            communicationType.Deactivate();
        }

        await _communicationTypeRepository.SaveAsync(communicationType, cancellationToken);
        return communicationType;
    }
}
