using Microsoft.EntityFrameworkCore;
using Npgsql;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Infrastructure.Persistence.Stakeholders;

/// <summary>
/// EF-Core-Implementierung von <see cref="IStakeholderRepository"/> gegen die
/// <c>stakeholders</c>-Tabelle (US-020) inkl. der zum Aggregate gehörenden
/// <c>stakeholder_communication_assignments</c>-Zeilen (US-039). Enthält ausschließlich technische
/// Persistenz-Logik, keine Geschäftsregeln — übersetzt aber die technische
/// Unique-Constraint-Verletzung bei parallelem Zugriff auf
/// <c>stakeholder_communication_assignments</c> in die fachliche
/// <see cref="AssignmentAlreadyExistsError"/> (US-039 Akzeptanzkriterium 5), da dies sonst als rohe
/// <see cref="DbUpdateException"/> bis zur Api-Schicht durchschlagen würde.
/// </summary>
public sealed class StakeholderRepository : IStakeholderRepository
{
    private const string CommunicationAssignmentUniqueConstraintName =
        "ix_stakeholder_communication_assignments_stakeholder_id_commun";

    private readonly SlobSteakDbContext _dbContext;

    public StakeholderRepository(SlobSteakDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <summary>Lädt einen Stakeholder inklusive seiner Kommunikationszuordnungen
    /// (<see cref="Stakeholder.CommunicationAssignments"/>) anhand seiner Id — ohne <c>Include</c>
    /// würde EF Core Änderungen an der Kollektion (<c>AssignCommunication</c> usw.) beim
    /// anschließenden <see cref="SaveAsync"/> nicht erkennen, da die Navigation dann nie als
    /// geladen markiert wurde. Ist <paramref name="includeDeleted"/> <c>false</c> (Default), liefert
    /// ein soft-gelöschter Stakeholder <c>null</c> — Standard-Leseabfragen filtern
    /// <c>deleted_at IS NULL</c> serverseitig (PRD Abschnitt 4.3 Punkt 5).</summary>
    public async Task<Stakeholder?> FindByIdAsync(Guid id, bool includeDeleted = false, CancellationToken cancellationToken = default)
    {
        var stakeholder = await _dbContext.Stakeholders
            .Include(s => s.CommunicationAssignments)
            .SingleOrDefaultAsync(s => s.Id == id, cancellationToken);
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

        // Client-generierte Guid-Schlüssel (siehe StakeholderCommunicationAssignment) lassen EF
        // Cores automatische Change-Detection über die Navigation
        // Stakeholder.CommunicationAssignments nicht zuverlässig zwischen neu hinzugefügten und
        // bereits vorhandenen (nur geänderten) Einträgen unterscheiden — bereits der Zugriff auf
        // ChangeTracker.Entries()/Entry() weiter unten löst DetectChanges aus, das einen neu
        // hinzugefügten Eintrag über die Relationship-Fixup-Logik fälschlich als "Modified" statt
        // "Added" einstuft. Welche Zuordnungen tatsächlich neu sind, wird daher VORAB über eine
        // reine (nicht getrackte) Existenzabfrage anhand der Ids bestimmt — und der Zustand danach
        // IMMER explizit gesetzt, unabhängig davon, was DetectChanges zuvor (fälschlich)
        // angenommen haben könnte; die explizite Zuweisung gewinnt, da sie zeitlich nach der
        // (unvermeidbaren) automatischen Einstufung erfolgt (ADR-0006, analog zu
        // ProjectRepository/ProjectMembership aus US-011).
        var candidateAssignmentIds = stakeholder.CommunicationAssignments.Select(a => a.Id).ToList();
        var alreadyPersistedAssignmentIds = candidateAssignmentIds.Count == 0
            ? new HashSet<Guid>()
            : (await _dbContext.StakeholderCommunicationAssignments.AsNoTracking()
                .Where(a => candidateAssignmentIds.Contains(a.Id))
                .Select(a => a.Id)
                .ToListAsync(cancellationToken)).ToHashSet();

        foreach (var assignment in stakeholder.CommunicationAssignments)
        {
            if (!alreadyPersistedAssignmentIds.Contains(assignment.Id))
            {
                _dbContext.Entry(assignment).State = EntityState.Added;
            }
        }

        // Entfernte Zuordnungen: bewusst NUR anhand der von DIESEM DbContext bereits getrackten
        // Einträge (nicht per weiterer live-DB-Abfrage!) — eine live-DB-Abfrage würde bei
        // parallelem Zugriff Zuordnungen sehen, die ein anderer Prozess zwischenzeitlich bereits
        // committet hat, aber diesem (unwissenden) Aggregate nie bekannt waren, und sie fälschlich
        // als "entfernt" löschen statt den in Akzeptanzkriterium 5 geforderten
        // Unique-Constraint-Konflikt auszulösen.
        var trackedAssignments = _dbContext.ChangeTracker.Entries<StakeholderCommunicationAssignment>()
            .Where(entry => entry.Entity.StakeholderId == stakeholder.Id)
            .ToList();

        var currentAssignmentIds = stakeholder.CommunicationAssignments.Select(a => a.Id).ToHashSet();
        foreach (var entry in trackedAssignments)
        {
            if (entry.State != EntityState.Added && !currentAssignmentIds.Contains(entry.Entity.Id))
            {
                entry.State = EntityState.Deleted;
            }
        }

        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsAssignmentUniqueViolation(ex))
        {
            var conflictingCommunicationTypeId = ex.Entries
                .Select(entry => entry.Entity)
                .OfType<StakeholderCommunicationAssignment>()
                .Select(a => a.CommunicationTypeId)
                .FirstOrDefault();

            throw new AssignmentAlreadyExistsError(stakeholder.Id, conflictingCommunicationTypeId);
        }
    }

    private static bool IsAssignmentUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException postgresException &&
        postgresException.SqlState == PostgresErrorCodes.UniqueViolation &&
        postgresException.ConstraintName == CommunicationAssignmentUniqueConstraintName;

    public async Task<bool> ExistsSimilarNameInProjectAsync(
        Guid projectId,
        string name,
        Guid? excludeStakeholderId = null,
        CancellationToken cancellationToken = default) =>
        await FindSimilarNameInProjectAsync(projectId, name, excludeStakeholderId, cancellationToken) is not null;

    public async Task<Stakeholder?> FindSimilarNameInProjectAsync(
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
        var candidates = await _dbContext.Stakeholders
            .Where(s => s.ProjectId == projectId && s.Id != excludeStakeholderId)
            .ToListAsync(cancellationToken);

        return candidates.FirstOrDefault(s => s.Name.Trim().ToLowerInvariant() == normalizedName);
    }

    public async Task<StakeholderDeletionImpact> GetDeletionImpactAsync(Guid stakeholderId, CancellationToken cancellationToken = default)
    {
        var assessmentCount = await _dbContext.StakeholderAssessments
            .CountAsync(a => a.StakeholderId == stakeholderId, cancellationToken);
        var communicationAssignmentCount = await _dbContext.StakeholderCommunicationAssignments
            .CountAsync(a => a.StakeholderId == stakeholderId, cancellationToken);

        return new StakeholderDeletionImpact(assessmentCount, communicationAssignmentCount);
    }
}
