using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SlobSteak.Domain.Identity;

namespace SlobSteak.Application.Identity;

/// <summary>
/// Application Service (US-005): legt beim ersten Anwendungsstart automatisch ein initiales
/// System-Administrator-Konto an, sofern die <c>users</c>-Tabelle noch leer ist. Orchestriert
/// ausschließlich den Use Case (liest Konfiguration, ruft das <see cref="User"/>-Aggregate und das
/// Repository auf) — enthält selbst keine Geschäftsregeln (CLAUDE.md Abschnitt 3.1).
/// </summary>
public sealed class SeedAdminService
{
    private const string SeedAdminEmailKey = "SEED_ADMIN_EMAIL";
    private const string SeedAdminPasswordKey = "SEED_ADMIN_PASSWORD";
    private const string SeedAdminName = "System-Administrator";

    private readonly IUserRepository _userRepository;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SeedAdminService> _logger;

    public SeedAdminService(IUserRepository userRepository, IConfiguration configuration, ILogger<SeedAdminService> logger)
    {
        _userRepository = userRepository;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Prüft, ob mindestens ein <see cref="User"/>-Datensatz existiert; existiert keiner, wird ein
    /// initiales Admin-Konto aus <c>SEED_ADMIN_EMAIL</c>/<c>SEED_ADMIN_PASSWORD</c> angelegt.
    /// </summary>
    /// <exception cref="SeedAdminConfigurationMissingException">Es existiert noch kein Nutzerkonto,
    /// aber <c>SEED_ADMIN_EMAIL</c> oder <c>SEED_ADMIN_PASSWORD</c> ist nicht gesetzt.</exception>
    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        if (await _userRepository.AnyAsync(cancellationToken))
        {
            _logger.LogInformation(
                "Seed-Admin-Bootstrap übersprungen: Es existiert bereits mindestens ein Nutzerkonto.");
            return;
        }

        var email = _configuration[SeedAdminEmailKey];
        var password = _configuration[SeedAdminPasswordKey];

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            var message =
                $"Seed-Admin-Bootstrap fehlgeschlagen: '{SeedAdminEmailKey}' und '{SeedAdminPasswordKey}' " +
                "müssen gesetzt sein, solange noch kein Nutzerkonto existiert.";
            _logger.LogCritical("{Message}", message);
            throw new SeedAdminConfigurationMissingException(message);
        }

        var admin = User.CreateSystemAdmin(SeedAdminName, email, password);
        await _userRepository.SaveAsync(admin, cancellationToken);

        _logger.LogInformation("Seed-Admin-Konto für {Email} wurde angelegt.", email);
    }
}
