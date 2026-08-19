using SlobSteak.Domain.Assessments;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Application.Assessments;

/// <summary>Ergebnis von <see cref="UpsertStakeholderAssessmentService.UpsertAsync"/> — trägt
/// zusätzlich den aufgelösten <see cref="UpdatedByName"/> sowie <see cref="WasCreated"/> (für die
/// Wahl zwischen <c>200 OK</c>/<c>201 Created</c>, Akzeptanzkriterium 1).</summary>
public sealed record UpsertAssessmentResult(StakeholderAssessment Assessment, string UpdatedByName, bool WasCreated);

/// <summary>
/// Application Service (US-028): legt ein Assessment für (Stakeholder, Rolle) an, falls keins
/// existiert, oder aktualisiert das bestehende (Akzeptanzkriterium 1). Orchestriert nur den Use
/// Case — Rollen-/Score-Validierung liegt im <see cref="StakeholderAssessment"/>-Aggregate
/// (US-027).
/// </summary>
public sealed class UpsertStakeholderAssessmentService
{
    private readonly IStakeholderAssessmentRepository _assessmentRepository;
    private readonly IUserRepository _userRepository;

    public UpsertStakeholderAssessmentService(IStakeholderAssessmentRepository assessmentRepository, IUserRepository userRepository)
    {
        _assessmentRepository = assessmentRepository;
        _userRepository = userRepository;
    }

    /// <param name="expectedVersion">Optimistisches Locking (Akzeptanzkriterium 3). Fehlt der
    /// Wert (<c>null</c>), wird ohne Konfliktprüfung gespeichert (Akzeptanzkriterium 4) — erreicht
    /// durch Übergabe der aktuellen <see cref="StakeholderAssessment.Version"/> als „erwartete“
    /// Version an <see cref="StakeholderAssessment.Update"/>, die dessen Prüfung dadurch immer
    /// erfüllt, ohne die Domain-Methode selbst ändern zu müssen.</param>
    /// <exception cref="Domain.Shared.Exceptions.InvalidAssessmentRoleError"><paramref name="role"/>
    /// ist keine perspektiv-tragende Rolle (nur beim Erstanlegen relevant).</exception>
    /// <exception cref="Domain.Shared.Exceptions.InvalidScoreRangeError"><paramref name="influence"/>
    /// oder <paramref name="interest"/> liegt außerhalb von 0–100.</exception>
    /// <exception cref="Domain.Shared.Exceptions.StaleAssessmentError"><paramref name="expectedVersion"/>
    /// ist gesetzt, entspricht aber nicht der aktuell persistierten Version (Akzeptanzkriterium 3).</exception>
    public async Task<UpsertAssessmentResult> UpsertAsync(
        Guid stakeholderId,
        ProjectRole role,
        int influence,
        int interest,
        string? notes,
        int? expectedVersion,
        Guid updatedBy,
        CancellationToken cancellationToken = default)
    {
        var existing = await _assessmentRepository.FindByStakeholderAndRoleAsync(stakeholderId, role, cancellationToken);

        StakeholderAssessment assessment;
        bool wasCreated;
        if (existing is null)
        {
            assessment = StakeholderAssessment.Create(stakeholderId, role, influence, interest, notes, updatedBy);
            wasCreated = true;
        }
        else
        {
            existing.Update(influence, interest, notes, updatedBy, expectedVersion ?? existing.Version);
            assessment = existing;
            wasCreated = false;
        }

        await _assessmentRepository.SaveAsync(assessment, cancellationToken);

        var updater = await _userRepository.FindByIdAsync(updatedBy, cancellationToken);
        return new UpsertAssessmentResult(assessment, updater?.Name ?? "(unbekannter Nutzer)", wasCreated);
    }
}
