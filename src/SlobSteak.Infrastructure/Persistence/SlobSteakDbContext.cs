using Microsoft.EntityFrameworkCore;
using SlobSteak.Domain.Assessments;
using SlobSteak.Domain.Communications;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Infrastructure.Persistence;

/// <summary>
/// EF-Core-<see cref="DbContext"/> für die gesamte Solution (US-003). Enthält ausschließlich
/// technische Persistenz-Verdrahtung (<c>DbSet</c>s, Anwendung der
/// <see cref="Microsoft.EntityFrameworkCore.IEntityTypeConfiguration{TEntity}"/>-Klassen aus
/// <c>Persistence/Configurations</c>) — keine Geschäftslogik, gemäß CLAUDE.md Abschnitt 3.1.
/// </summary>
public sealed class SlobSteakDbContext : DbContext
{
    public SlobSteakDbContext(DbContextOptions<SlobSteakDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    public DbSet<Project> Projects => Set<Project>();

    public DbSet<ProjectMembership> ProjectMemberships => Set<ProjectMembership>();

    public DbSet<Stakeholder> Stakeholders => Set<Stakeholder>();

    public DbSet<StakeholderAssessment> StakeholderAssessments => Set<StakeholderAssessment>();

    public DbSet<CommunicationType> CommunicationTypes => Set<CommunicationType>();

    public DbSet<StakeholderCommunicationAssignment> StakeholderCommunicationAssignments =>
        Set<StakeholderCommunicationAssignment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(SlobSteakDbContext).Assembly);
    }
}
