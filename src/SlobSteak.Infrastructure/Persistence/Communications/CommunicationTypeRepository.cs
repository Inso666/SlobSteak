using Microsoft.EntityFrameworkCore;
using Npgsql;
using SlobSteak.Domain.Communications;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Infrastructure.Persistence.Communications;

/// <summary>
/// EF-Core-Implementierung von <see cref="ICommunicationTypeRepository"/> gegen die
/// <c>communication_types</c>-Tabelle (US-003/US-037). Enthält ausschließlich technische
/// Persistenz-Logik, keine Geschäftsregeln (CLAUDE.md Abschnitt 3.1) — übersetzt aber die
/// technische Unique-Constraint-Verletzung bei parallelem Zugriff auf
/// <c>communication_types.name</c> in die fachliche <see cref="CommunicationTypeNameAlreadyInUseError"/>,
/// analog zu <c>UserRepository</c> (ADR-0006).
/// </summary>
public sealed class CommunicationTypeRepository : ICommunicationTypeRepository
{
    private const string NameUniqueConstraintName = "ix_communication_types_name";

    private readonly SlobSteakDbContext _dbContext;

    public CommunicationTypeRepository(SlobSteakDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<CommunicationType?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _dbContext.CommunicationTypes.SingleOrDefaultAsync(c => c.Id == id, cancellationToken);

    public Task<bool> ExistsByNameAsync(string name, Guid? excludingId = null, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.CommunicationTypes.Where(c => c.Name == name);
        if (excludingId is not null)
        {
            query = query.Where(c => c.Id != excludingId.Value);
        }

        return query.AnyAsync(cancellationToken);
    }

    public async Task SaveAsync(CommunicationType communicationType, CancellationToken cancellationToken = default)
    {
        var isTracked = _dbContext.ChangeTracker.Entries<CommunicationType>().Any(entry => entry.Entity.Id == communicationType.Id);
        if (!isTracked && !await _dbContext.CommunicationTypes.AnyAsync(c => c.Id == communicationType.Id, cancellationToken))
        {
            _dbContext.CommunicationTypes.Add(communicationType);
        }
        else if (!isTracked)
        {
            _dbContext.CommunicationTypes.Update(communicationType);
        }

        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsNameUniqueViolation(ex))
        {
            throw new CommunicationTypeNameAlreadyInUseError(communicationType.Name);
        }
    }

    private static bool IsNameUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException postgresException &&
        postgresException.SqlState == PostgresErrorCodes.UniqueViolation &&
        postgresException.ConstraintName == NameUniqueConstraintName;

    public async Task<IReadOnlyList<CommunicationType>> FindAllAsync(bool activeOnly, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.CommunicationTypes.AsQueryable();
        if (activeOnly)
        {
            query = query.Where(c => c.IsActive);
        }

        return await query.OrderBy(c => c.Name).ToListAsync(cancellationToken);
    }
}
