using SlobSteak.Domain.Communications;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Application.Communications;

/// <summary>
/// Application Service (US-037): legt einen neuen, instanzweiten Kommunikationsarten-
/// Katalogeintrag an — ausschließlich über den Admin-Weg möglich (PRD Abschnitt F5.3). Orchestriert
/// nur den Use Case; die eigentliche Erzeugung liegt in <see cref="CommunicationType.Create"/>.
/// </summary>
public sealed class CreateCommunicationTypeService
{
    private readonly ICommunicationTypeRepository _communicationTypeRepository;

    public CreateCommunicationTypeService(ICommunicationTypeRepository communicationTypeRepository)
    {
        _communicationTypeRepository = communicationTypeRepository;
    }

    /// <exception cref="CommunicationTypeNameRequiredError"><paramref name="name"/> ist leer oder
    /// besteht nur aus Leerzeichen.</exception>
    /// <exception cref="CommunicationTypeNameAlreadyInUseError">Es existiert bereits ein
    /// Katalogeintrag mit diesem Namen — proaktiv geprüft, zusätzlich als zweite
    /// Verteidigungslinie durch den DB-Unique-Index bei parallelem Zugriff abgesichert
    /// (Infrastructure-Implementierung von <see cref="ICommunicationTypeRepository"/>).</exception>
    public async Task<CommunicationType> CreateCommunicationTypeAsync(string name, CancellationToken cancellationToken = default)
    {
        if (await _communicationTypeRepository.ExistsByNameAsync(name, excludingId: null, cancellationToken))
        {
            throw new CommunicationTypeNameAlreadyInUseError(name);
        }

        var communicationType = CommunicationType.Create(name);
        await _communicationTypeRepository.SaveAsync(communicationType, cancellationToken);
        return communicationType;
    }
}
