using Microsoft.EntityFrameworkCore;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Infrastructure.Persistence.Stakeholders;

/// <summary>
/// EF-Core-Implementierung von <see cref="IStakeholderRepository"/> gegen die
/// <c>stakeholders</c>-Tabelle (US-020).
/// </summary>
public sealed class StakeholderRepository : IStakeholderRepository
{
    private readonly SlobSteakDbContext _dbContext;

    public StakeholderRepository(SlobSteakDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Stakeholder?> FindByIdAsync(Guid id, bool includeDeleted = false, CancellationToken cancellationToken = default)
    {
        var stakeholder = await _dbContext.Stakeholders.SingleOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (stakeholder is null)
        {
            return null;
        }

        if (!includeDeleted && stakeholder.IsDeleted())
        {
            return null;
        }

        return stakeholder;
    }

    public async Task<IReadOnlyList<Stakeholder>> FindActiveByProjectAsync(Guid projectId, CancellationToken cancellationToken = default) =>
        await _dbContext.Stakeholders
            .Where(s => s.ProjectId == projectId && s.DeletedAt == null)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Stakeholder>> FindDeletedByProjectAsync(Guid projectId, CancellationToken cancellationToken = default) =>
        await _dbContext.Stakeholders
            .Where(s => s.ProjectId == projectId && s.DeletedAt != null)
            .ToListAsync(cancellationToken);

    public async Task SaveAsync(Stakeholder stakeholder, CancellationToken cancellationToken = default)
    {
        var isTracked = _dbContext.ChangeTracker.Entries<Stakeholder>().Any(entry => entry.Entity.Id == stakeholder.Id);
        if (!isTracked && !await _dbContext.Stakeholders.AnyAsync(s => s.Id == stakeholder.Id, cancellationToken))
        {
            _dbContext.Stakeholders.Add(stakeholder);
        }
        else
        {
            _dbContext.Stakeholders.Update(stakeholder);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> ExistsSimilarNameInProjectAsync(
        Guid projectId,
        string name,
        Guid? excludeStakeholderId = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedName = name.Trim().ToLowerInvariant();

        // Bewusst inklusive soft-gelöschter Datensätze (kein `DeletedAt == null`-Filter) — der
        // Hinweistext beim Anlegen soll auch auf einen bereits gelöschten, ähnlich benannten
        // Stakeholder hinweisen können (PRD Abschnitt 4.3). Client-seitiger Vergleich statt
        // SQL-`ILIKE`, um von der plattformunabhängigen .NET-Kleinschreibung/Trim-Semantik
        // unabhängig von der DB-Collation zu bleiben — bei kleinen Projektgrößen unkritisch.
        var namesInProject = await _dbContext.Stakeholders
            .Where(s => s.ProjectId == projectId && s.Id != excludeStakeholderId)
            .Select(s => s.Name)
            .ToListAsync(cancellationToken);

        return namesInProject.Any(existingName => existingName.Trim().ToLowerInvariant() == normalizedName);
    }
}
