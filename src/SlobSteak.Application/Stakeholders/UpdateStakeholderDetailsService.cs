using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Stakeholders;

/// <summary>
/// Application Service (US-022): aktualisiert die Stammdaten eines bestehenden Stakeholders.
/// Orchestriert nur den Use Case — die eigentlichen Regeln (Pflichtfeld <c>name</c>,
/// E-Mail-Format, Aktualisierung von <c>updated_by</c>/<c>updated_at</c>) liegen im
/// <see cref="Stakeholder"/>-Aggregate (US-020).
/// </summary>
public sealed class UpdateStakeholderDetailsService
{
    private readonly IStakeholderRepository _stakeholderRepository;
    private readonly IUserRepository _userRepository;

    public UpdateStakeholderDetailsService(IStakeholderRepository stakeholderRepository, IUserRepository userRepository)
    {
        _stakeholderRepository = stakeholderRepository;
        _userRepository = userRepository;
    }

    /// <summary>Liefert <c>null</c>, wenn der Stakeholder nicht existiert oder soft-gelöscht ist —
    /// beides gilt für Standard-Leseabfragen als „nicht vorhanden“ (US-022 Akzeptanzkriterium 5,
    /// PRD Abschnitt 4.3 Punkt 5).</summary>
    /// <exception cref="Domain.Shared.Exceptions.StakeholderNameRequiredError"><paramref name="name"/>
    /// ist leer oder besteht nur aus Leerzeichen.</exception>
    /// <exception cref="Domain.Shared.Exceptions.InvalidEmailFormatError"><paramref name="email"/>
    /// ist gesetzt, aber kein gültiges E-Mail-Format.</exception>
    public async Task<UpdateStakeholderDetailsResult?> UpdateStakeholderDetailsAsync(
        Guid stakeholderId,
        StakeholderType type,
        string name,
        string? organization,
        string? position,
        string? email,
        string? phone,
        string? locationDepartment,
        string? description,
        Guid updatedBy,
        CancellationToken cancellationToken = default)
    {
        var stakeholder = await _stakeholderRepository.FindByIdAsync(stakeholderId, includeDeleted: false, cancellationToken);
        if (stakeholder is null)
        {
            return null;
        }

        stakeholder.UpdateDetails(type, name, organization, position, email, phone, locationDepartment, description, updatedBy);
        await _stakeholderRepository.SaveAsync(stakeholder, cancellationToken);

        var updater = await _userRepository.FindByIdAsync(updatedBy, cancellationToken);
        return new UpdateStakeholderDetailsResult(stakeholder, updater?.Name ?? "(unbekannter Nutzer)");
    }
}
