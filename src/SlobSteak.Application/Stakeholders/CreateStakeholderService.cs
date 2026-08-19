using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Stakeholders;

/// <summary>
/// Application Service (US-021): legt einen neuen Stakeholder in einem Projekt an. Orchestriert
/// nur den Use Case — die eigentlichen Regeln (Pflichtfeld <c>name</c>, E-Mail-Format) liegen im
/// <see cref="Stakeholder"/>-Aggregate (US-020). Die Namensduplikatsprüfung ist bewusst rein
/// informativ (kein Blocker, F1.1 Edge Case): das Anlegen erfolgt unabhängig vom Ergebnis.
/// </summary>
public sealed class CreateStakeholderService
{
    private readonly IStakeholderRepository _stakeholderRepository;

    public CreateStakeholderService(IStakeholderRepository stakeholderRepository)
    {
        _stakeholderRepository = stakeholderRepository;
    }

    /// <exception cref="Domain.Shared.Exceptions.StakeholderNameRequiredError"><paramref name="name"/>
    /// ist leer oder besteht nur aus Leerzeichen.</exception>
    /// <exception cref="Domain.Shared.Exceptions.InvalidEmailFormatError"><paramref name="email"/>
    /// ist gesetzt, aber kein gültiges E-Mail-Format.</exception>
    public async Task<CreateStakeholderResult> CreateStakeholderAsync(
        Guid projectId,
        StakeholderType type,
        string name,
        string? organization,
        string? position,
        string? email,
        string? phone,
        string? locationDepartment,
        string? description,
        Guid createdBy,
        CancellationToken cancellationToken = default)
    {
        var stakeholder = Stakeholder.Create(
            projectId, type, name, organization, position, email, phone, locationDepartment, description, createdBy);

        var similar = await _stakeholderRepository.FindSimilarNameInProjectAsync(projectId, name, cancellationToken: cancellationToken);

        await _stakeholderRepository.SaveAsync(stakeholder, cancellationToken);

        var warning = similar is null ? null : new SimilarStakeholderWarning(similar.Id, similar.Name);
        return new CreateStakeholderResult(stakeholder, warning);
    }
}
