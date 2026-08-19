using SlobSteak.Domain.Identity;

namespace SlobSteak.Application.Identity;

/// <summary>
/// Application Service (US-016): listet alle Nutzerkonten für den Admin-Bereich. Trivialer Use
/// Case, aber konsequent über die Application-Schicht geführt statt den Controller direkt gegen
/// <see cref="IUserRepository"/> arbeiten zu lassen (CLAUDE.md Abschnitt 3.1).
/// </summary>
public sealed class ListUsersService
{
    private readonly IUserRepository _userRepository;

    public ListUsersService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public Task<IReadOnlyList<User>> ListUsersAsync(CancellationToken cancellationToken = default) =>
        _userRepository.FindAllAsync(cancellationToken);
}
