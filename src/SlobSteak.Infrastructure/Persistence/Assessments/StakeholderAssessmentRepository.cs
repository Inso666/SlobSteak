using Microsoft.EntityFrameworkCore;
using SlobSteak.Domain.Assessments;
using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Infrastructure.Persistence.Assessments;

/// <summary>
/// EF-Core-Implementierung von <see cref="IStakeholderAssessmentRepository"/> gegen die
/// <c>stakeholder_assessments</c>-Tabelle (US-027). Der Unique-Index auf (<c>stakeholder_id</c>,
/// <c>role</c>) — Akzeptanzkriterium 5 — ist bereits seit US-003 in
/// <see cref="Configurations.StakeholderAssessmentConfiguration"/> konfiguriert.
/// </summary>
public sealed class StakeholderAssessmentRepository : IStakeholderAssessmentRepository
{
    private readonly SlobSteakDbContext _dbContext;

    public StakeholderAssessmentRepository(SlobSteakDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<StakeholderAssessment?> FindByStakeholderAndRoleAsync(
        Guid stakeholderId, ProjectRole role, CancellationToken cancellationToken = default) =>
        await _dbContext.StakeholderAssessments
            .SingleOrDefaultAsync(a => a.StakeholderId == stakeholderId && a.Role == role, cancellationToken);

    public async Task<IReadOnlyList<StakeholderAssessment>> FindAllByStakeholderAsync(
        Guid stakeholderId, CancellationToken cancellationToken = default) =>
        await _dbContext.StakeholderAssessments
            .Where(a => a.StakeholderId == stakeholderId)
            .ToListAsync(cancellationToken);

    public async Task SaveAsync(StakeholderAssessment assessment, CancellationToken cancellationToken = default)
    {
        var isTracked = _dbContext.ChangeTracker.Entries<StakeholderAssessment>().Any(entry => entry.Entity.Id == assessment.Id);
        if (!isTracked && !await _dbContext.StakeholderAssessments.AnyAsync(a => a.Id == assessment.Id, cancellationToken))
        {
            _dbContext.StakeholderAssessments.Add(assessment);
        }
        else if (!isTracked)
        {
            _dbContext.StakeholderAssessments.Update(assessment);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
