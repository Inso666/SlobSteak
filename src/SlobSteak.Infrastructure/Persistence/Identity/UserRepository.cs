using Microsoft.EntityFrameworkCore;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Shared.ValueObjects;

namespace SlobSteak.Infrastructure.Persistence.Identity;

/// <summary>
/// EF-Core-Implementierung von <see cref="IUserRepository"/> gegen die <c>users</c>-Tabelle
/// (US-003/US-004). Enthält ausschließlich technische Persistenz-Logik, keine Geschäftsregeln
/// (CLAUDE.md Abschnitt 3.1).
/// </summary>
public sealed class UserRepository : IUserRepository
{
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

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<bool> ExistsByEmailAsync(Email email, CancellationToken cancellationToken = default) =>
        _dbContext.Users.AnyAsync(u => u.Email == email, cancellationToken);

    public Task<bool> AnyAsync(CancellationToken cancellationToken = default) =>
        _dbContext.Users.AnyAsync(cancellationToken);
}
