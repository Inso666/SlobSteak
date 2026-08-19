using Microsoft.EntityFrameworkCore;
using SlobSteak.Domain.Projects;

namespace SlobSteak.Infrastructure.Persistence.Projects;

/// <summary>
/// EF-Core-Implementierung von <see cref="IProjectOverviewQuery"/> (US-018). Liest direkt über
/// <c>project_memberships</c>, <c>projects</c> und <c>stakeholders</c> — die Stakeholder-Zählung
/// verwendet bewusst kein <c>IStakeholderRepository</c> (existiert erst ab US-020, siehe
/// <c>docs/adr/0001-domain-entity-skeletons-vor-aggregate-stories.md</c>): als reines,
/// lastarmes Read-Modell ist ein direkter Zugriff auf das bereits seit US-003 migrierte
/// <c>Stakeholders</c>-DbSet zulässig, ohne die volle Stakeholder-Aggregate-Logik vorwegzunehmen.
/// </summary>
public sealed class ProjectOverviewQuery : IProjectOverviewQuery
{
    private readonly SlobSteakDbContext _dbContext;

    public ProjectOverviewQuery(SlobSteakDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ProjectOverviewItem>> GetForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var memberships = await _dbContext.ProjectMemberships
            .Where(m => m.UserId == userId)
            .ToListAsync(cancellationToken);

        if (memberships.Count == 0)
        {
            return Array.Empty<ProjectOverviewItem>();
        }

        var projectIds = memberships.Select(m => m.ProjectId).ToList();

        var projectNamesById = await _dbContext.Projects
            .Where(p => projectIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name, cancellationToken);

        var stakeholderCountsByProjectId = await _dbContext.Stakeholders
            .Where(s => projectIds.Contains(s.ProjectId) && s.DeletedAt == null)
            .GroupBy(s => s.ProjectId)
            .Select(g => new { ProjectId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ProjectId, x => x.Count, cancellationToken);

        return memberships
            .Where(m => projectNamesById.ContainsKey(m.ProjectId))
            .Select(m => new ProjectOverviewItem(
                m.ProjectId,
                projectNamesById[m.ProjectId],
                m.Role,
                stakeholderCountsByProjectId.GetValueOrDefault(m.ProjectId, 0)))
            .ToList();
    }
}
