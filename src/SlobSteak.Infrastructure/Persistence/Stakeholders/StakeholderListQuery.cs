using Microsoft.EntityFrameworkCore;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Infrastructure.Persistence.Stakeholders;

/// <summary>
/// EF-Core-Implementierung von <see cref="IStakeholderListQuery"/> (US-025).
/// </summary>
public sealed class StakeholderListQuery : IStakeholderListQuery
{
    private readonly SlobSteakDbContext _dbContext;

    public StakeholderListQuery(SlobSteakDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<Stakeholder>> SearchActiveByProjectAsync(
        Guid projectId,
        string? search,
        StakeholderType? type,
        Guid? communicationTypeId,
        CancellationToken cancellationToken = default)
    {
        // US-072: `.Include` lädt zusätzlich die Kommunikationszuordnungen mit — ohne diese wäre
        // `Stakeholder.CommunicationAssignments` für jeden Listeneintrag stets leer, unabhängig
        // von der tatsächlichen Datenlage (Grundlage von `ListStakeholdersService.CommunicationTypeNames`,
        // analog zum bestehenden Include in `StakeholderRepository.FindActiveByProjectAsync`).
        var query = _dbContext.Stakeholders
            .Include(s => s.CommunicationAssignments)
            .Where(s => s.ProjectId == projectId && s.DeletedAt == null);

        if (type is not null)
        {
            query = query.Where(s => s.Type == type);
        }

        if (communicationTypeId is not null)
        {
            var stakeholderIdsWithCommunicationType = _dbContext.StakeholderCommunicationAssignments
                .Where(a => a.CommunicationTypeId == communicationTypeId)
                .Select(a => a.StakeholderId);
            query = query.Where(s => stakeholderIdsWithCommunicationType.Contains(s.Id));
        }

        var stakeholders = await query.ToListAsync(cancellationToken);

        // Case-insensitiver Teilstring-Match client-seitig (analog zu
        // ExistsSimilarNameInProjectAsync/FindSimilarNameInProjectAsync, US-020/US-021) — bei
        // kleinen Projektgrößen unkritisch, unabhängig von der DB-Collation.
        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim().ToLowerInvariant();
            stakeholders = stakeholders
                .Where(s =>
                    s.Name.Contains(normalizedSearch, StringComparison.InvariantCultureIgnoreCase) ||
                    (s.Organization is not null && s.Organization.Contains(normalizedSearch, StringComparison.InvariantCultureIgnoreCase)))
                .ToList();
        }

        return stakeholders;
    }
}
