using Microsoft.EntityFrameworkCore;
using Npgsql;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Shared.ValueObjects;

namespace SlobSteak.Infrastructure.Persistence.Identity;

/// <summary>
/// EF-Core-Implementierung von <see cref="IUserRepository"/> gegen die <c>users</c>-Tabelle
/// (US-003/US-004). Enthält ausschließlich technische Persistenz-Logik, keine Geschäftsregeln
/// (CLAUDE.md Abschnitt 3.1) — übersetzt aber die technische Unique-Constraint-Verletzung bei
/// parallelem Zugriff auf <c>users.email</c> in die fachliche <see cref="EmailAlreadyInUseError"/>
/// (US-012), analog zu <c>ProjectRepository</c> (siehe ADR-0006).
/// </summary>
public sealed class UserRepository : IUserRepository
{
    private const string EmailUniqueConstraintName = "ix_users_email";

    private readonly SlobSteakDbContext _dbContext;

    public UserRepository(SlobSteakDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<User?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _dbContext.Users.SingleOrDefaultAsync(u => u.Id == id, cancellationToken);

    public Task<User?> FindByEmailAsync(Email email, CancellationToken cancellationToken = default) =>
        _dbContext.Users.SingleOrDefaultAsync(u => u.Email == email, cancellationToken);

    public async Task SaveAsync(User user, CancellationToken cancellationToken = default)
    {
        var isTracked = _dbContext.ChangeTracker.Entries<User>().Any(entry => entry.Entity.Id == user.Id);
        if (!isTracked && !await _dbContext.Users.AnyAsync(u => u.Id == user.Id, cancellationToken))
        {
            _dbContext.Users.Add(user);
        }
        else if (!isTracked)
        {
            _dbContext.Users.Update(user);
        }

        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsEmailUniqueViolation(ex))
        {
            throw new EmailAlreadyInUseError(user.Email.Value);
        }
    }

    private static bool IsEmailUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException postgresException &&
        postgresException.SqlState == PostgresErrorCodes.UniqueViolation &&
        postgresException.ConstraintName == EmailUniqueConstraintName;

    public Task<bool> ExistsByEmailAsync(Email email, CancellationToken cancellationToken = default) =>
        _dbContext.Users.AnyAsync(u => u.Email == email, cancellationToken);

    public Task<bool> AnyAsync(CancellationToken cancellationToken = default) =>
        _dbContext.Users.AnyAsync(cancellationToken);
}
