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

        // US-074/US-076: Projektion statt vollständiger Aggregate-Rekonstruktion — Name, Status,
        // CreatedAt und UpdatedAt genügen für die Projektübersicht, `Description`/`Memberships`
        // werden hier nicht benötigt (reines Read-Modell, siehe Klassen-Dokumentation).
        var projectsById = await _dbContext.Projects
            .Where(p => projectIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Name, p.Status, p.CreatedAt, p.UpdatedAt })
            .ToDictionaryAsync(p => p.Id, cancellationToken);

        var stakeholderCountsByProjectId = await _dbContext.Stakeholders
            .Where(s => projectIds.Contains(s.ProjectId) && s.DeletedAt == null)
            .GroupBy(s => s.ProjectId)
            .Select(g => new { ProjectId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ProjectId, x => x.Count, cancellationToken);

        return memberships
            .Where(m => projectsById.ContainsKey(m.ProjectId))
            .Select(m =>
            {
                var project = projectsById[m.ProjectId];
                return new ProjectOverviewItem(
                    m.ProjectId,
                    project.Name,
                    m.Role,
                    stakeholderCountsByProjectId.GetValueOrDefault(m.ProjectId, 0),
                    project.Status,
                    project.CreatedAt,
                    project.UpdatedAt);
            })
            .ToList();
    }
}
