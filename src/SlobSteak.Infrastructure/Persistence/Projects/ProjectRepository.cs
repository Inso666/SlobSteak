using Microsoft.EntityFrameworkCore;
using SlobSteak.Domain.Projects;

namespace SlobSteak.Infrastructure.Persistence.Projects;

/// <summary>
/// EF-Core-Implementierung von <see cref="IProjectRepository"/> gegen die <c>projects</c>-Tabelle
/// (US-010). Enthält ausschließlich technische Persistenz-Logik, keine Geschäftsregeln.
/// </summary>
public sealed class ProjectRepository : IProjectRepository
{
    private readonly SlobSteakDbContext _dbContext;

    public ProjectRepository(SlobSteakDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<Project?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _dbContext.Projects.SingleOrDefaultAsync(p => p.Id == id, cancellationToken);

    public async Task SaveAsync(Project project, CancellationToken cancellationToken = default)
    {
        var isTracked = _dbContext.ChangeTracker.Entries<Project>().Any(entry => entry.Entity.Id == project.Id);
        if (!isTracked && !await _dbContext.Projects.AnyAsync(p => p.Id == project.Id, cancellationToken))
        {
            _dbContext.Projects.Add(project);
        }
        else if (!isTracked)
        {
            _dbContext.Projects.Update(project);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Project>> FindAllAsync(CancellationToken cancellationToken = default) =>
        await _dbContext.Projects.ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Project>> FindByMemberUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var projectIds = _dbContext.ProjectMemberships
            .Where(m => m.UserId == userId)
            .Select(m => m.ProjectId);

        return await _dbContext.Projects
            .Where(p => projectIds.Contains(p.Id))
            .ToListAsync(cancellationToken);
    }
}
