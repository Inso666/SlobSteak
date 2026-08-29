using SlobSteak.Domain.Communications;

namespace SlobSteak.Application.Communications;

/// <summary>
/// Application Service (US-037 Akzeptanzkriterium 4): listet die Kommunikationsarten des
/// instanzweiten Katalogs — trivialer Use Case, aber konsequent über die Application-Schicht
/// geführt statt den Controller direkt gegen <see cref="ICommunicationTypeRepository"/> arbeiten
/// zu lassen (CLAUDE.md Abschnitt 3.1).
/// </summary>
public sealed class ListCommunicationTypesQuery
{
    private readonly ICommunicationTypeRepository _communicationTypeRepository;

    public ListCommunicationTypesQuery(ICommunicationTypeRepository communicationTypeRepository)
    {
        _communicationTypeRepository = communicationTypeRepository;
    }

    /// <summary>Mit <paramref name="activeOnly"/><c>= true</c> nur aktive Einträge (Auswahl bei
    /// neuen Zuordnungen), sonst alle Einträge inkl. deaktivierter (historische Anzeige).</summary>
    public Task<IReadOnlyList<CommunicationType>> ListAsync(bool activeOnly, CancellationToken cancellationToken = default) =>
        _communicationTypeRepository.FindAllAsync(activeOnly, cancellationToken);
}
