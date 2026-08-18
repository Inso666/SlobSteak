using Microsoft.EntityFrameworkCore;
using Npgsql;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Infrastructure.Persistence.Projects;

/// <summary>
/// EF-Core-Implementierung von <see cref="IProjectRepository"/> gegen die <c>projects</c>-Tabelle
/// (US-010) inkl. der zum Aggregate gehörenden <c>project_memberships</c>-Zeilen (US-011).
/// Enthält ausschließlich technische Persistenz-Logik, keine Geschäftsregeln — übersetzt aber die
/// technische Unique-Constraint-Verletzung bei parallelem Zugriff auf
/// <c>project_memberships</c> in die fachliche <see cref="MembershipAlreadyExistsError"/>
/// (US-011 Akzeptanzkriterium 5), da dies sonst als rohe <see cref="DbUpdateException"/> bis zur
/// Api-Schicht durchschlagen würde.
/// </summary>
public sealed class ProjectRepository : IProjectRepository
{
    private const string MembershipUniqueConstraintName = "ix_project_memberships_project_id_user_id";

    private readonly SlobSteakDbContext _dbContext;

    public ProjectRepository(SlobSteakDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <summary>Lädt ein Projekt inklusive seiner Mitgliedschaften (<see cref="Project.Memberships"/>)
    /// — ohne <c>Include</c> würde EF Core Änderungen an der Kollektion (<c>AssignMember</c> usw.)
    /// beim anschließenden <see cref="SaveAsync"/> nicht erkennen, da die Navigation dann nie als
    /// geladen markiert wurde.</summary>
    public Task<Project?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _dbContext.Projects.Include(p => p.Memberships).SingleOrDefaultAsync(p => p.Id == id, cancellationToken);

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

        // Client-generierte Guid-Schlüssel (siehe ProjectMembership) lassen EF Cores automatische
        // Change-Detection über die Navigation Project.Memberships nicht zuverlässig zwischen neu
        // hinzugefügten und bereits vorhandenen (nur geänderten) Einträgen unterscheiden — bereits
        // der Zugriff auf ChangeTracker.Entries()/Entry() weiter unten löst DetectChanges aus, das
        // einen neu hinzugefügten Eintrag über die Relationship-Fixup-Logik fälschlich als
        // "Modified" statt "Added" einstuft. Welche Mitgliedschaften tatsächlich neu sind, wird
        // daher VORAB über eine reine (nicht getracktes) Existenzabfrage anhand der Ids bestimmt —
        // und der Zustand danach IMMER explizit gesetzt, unabhängig davon, was DetectChanges zuvor
        // (fälschlich) angenommen haben könnte; die explizite Zuweisung gewinnt, da sie zeitlich
        // nach der (unvermeidbaren) automatischen Einstufung erfolgt.
        var candidateMembershipIds = project.Memberships.Select(m => m.Id).ToList();
        var alreadyPersistedMembershipIds = candidateMembershipIds.Count == 0
            ? new HashSet<Guid>()
            : (await _dbContext.ProjectMemberships.AsNoTracking()
                .Where(m => candidateMembershipIds.Contains(m.Id))
                .Select(m => m.Id)
                .ToListAsync(cancellationToken)).ToHashSet();

        foreach (var membership in project.Memberships)
        {
            if (!alreadyPersistedMembershipIds.Contains(membership.Id))
            {
                _dbContext.Entry(membership).State = EntityState.Added;
            }
        }

        // Entfernte Mitgliedschaften: bewusst NUR anhand der von DIESEM DbContext bereits
        // getrackten Einträge (nicht per weiterer live-DB-Abfrage!) — eine live-DB-Abfrage würde
        // bei parallelem Zugriff Mitgliedschaften sehen, die ein anderer Prozess zwischenzeitlich
        // bereits committet hat, aber diesem (unwissenden) Aggregate nie bekannt waren, und sie
        // fälschlich als "entfernt" löschen statt den in Akzeptanzkriterium 5 geforderten
        // Unique-Constraint-Konflikt auszulösen.
        var trackedMemberships = _dbContext.ChangeTracker.Entries<ProjectMembership>()
            .Where(entry => entry.Entity.ProjectId == project.Id)
            .ToList();

        var currentMembershipIds = project.Memberships.Select(m => m.Id).ToHashSet();
        foreach (var entry in trackedMemberships)
        {
            if (entry.State != EntityState.Added && !currentMembershipIds.Contains(entry.Entity.Id))
            {
                entry.State = EntityState.Deleted;
            }
        }

        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsMembershipUniqueViolation(ex))
        {
            var conflictingUserId = ex.Entries
                .Select(entry => entry.Entity)
                .OfType<ProjectMembership>()
                .Select(m => m.UserId)
                .FirstOrDefault();

            throw new MembershipAlreadyExistsError(project.Id, conflictingUserId);
        }
    }

    private static bool IsMembershipUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException postgresException &&
        postgresException.SqlState == PostgresErrorCodes.UniqueViolation &&
        postgresException.ConstraintName == MembershipUniqueConstraintName;

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
