using System.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SlobSteak.Application.Identity;

namespace SlobSteak.Api.Bootstrap;

/// <summary>
/// Startup-Hook (US-005): ruft <see cref="SeedAdminService.SeedAsync"/> beim Hoststart in einem
/// eigenen DI-Scope auf (der Application Service hängt vom gescopeten <c>IUserRepository</c> ab,
/// dieser Hosted Service selbst ist Singleton). Wirft der Service eine Exception (fehlende
/// Seed-Konfiguration), bricht der Hoststart mit dieser Fehlermeldung ab — kein stiller Fehlschlag
/// (Akzeptanzkriterium 3 der Story).
///
/// US-049: loggt Start-/Ende-Zeitstempel um <see cref="SeedAdminService.SeedAsync"/> herum, damit
/// dieser Kaltstart-Anteil (bei der realen Messung der Story unauffällig, da die
/// <c>AnyAsync</c>-Prüfung bei leerer Tabelle günstig ist und nur bei einer noch komplett leeren
/// <c>users</c>-Tabelle überhaupt ein Insert stattfindet) sichtbar bleibt und künftige Regressionen
/// sofort im Log auffallen.
/// </summary>
public sealed class SeedAdminHostedService : IHostedService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SeedAdminHostedService> _logger;

    public SeedAdminHostedService(IServiceProvider serviceProvider, ILogger<SeedAdminHostedService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("US-049: Seed-Admin-Bootstrap gestartet.");
        var stopwatch = Stopwatch.StartNew();

        using var scope = _serviceProvider.CreateScope();
        var seedAdminService = scope.ServiceProvider.GetRequiredService<SeedAdminService>();
        await seedAdminService.SeedAsync(cancellationToken);

        stopwatch.Stop();
        _logger.LogInformation(
            "US-049: Seed-Admin-Bootstrap abgeschlossen nach {DurationMs} ms.",
            stopwatch.ElapsedMilliseconds);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
