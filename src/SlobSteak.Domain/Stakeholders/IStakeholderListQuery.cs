using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Domain.Stakeholders;

/// <summary>
/// Port (US-025) für die durchsuchbare/filterbare Stakeholderliste eines Projekts, implementiert
/// in <c>SlobSteak.Infrastructure</c>. Liegt bewusst in der Domain (nicht in
/// <c>SlobSteak.Application</c>), da <c>SlobSteak.Infrastructure</c> laut CLAUDE.md Abschnitt 3.1
/// nur auf <c>SlobSteak.Domain</c> referenzieren darf — analog zu <see cref="IProjectRepository"/>
/// bzw. <c>IProjectOverviewQuery</c> (US-018). Reines Read-Modell, kein Repository im Sinne der
/// Aggregate-Persistenz: filtert stets <c>deleted_at IS NULL</c> (Standardliste, PRD Abschnitt
/// 4.3 Punkt 5) und joint bei gesetztem <paramref name="communicationTypeId"/> gegen
/// <c>stakeholder_communication_assignments</c> — beides ohne eigene Aggregate-Rekonstruktion.
/// </summary>
public interface IStakeholderListQuery
{
    /// <param name="search">Case-insensitiver Teilstring-Match über <c>name</c> und
    /// <c>organization</c> (US-025 Akzeptanzkriterium 2); <c>null</c>/leer = kein Filter.</param>
    /// <param name="type">Optionaler Typ-Filter.</param>
    /// <param name="communicationTypeId">Optionaler Filter auf zugeordnete Kommunikationsart.</param>
    Task<IReadOnlyList<Stakeholder>> SearchActiveByProjectAsync(
        Guid projectId,
        string? search,
        StakeholderType? type,
        Guid? communicationTypeId,
        CancellationToken cancellationToken = default);
}
