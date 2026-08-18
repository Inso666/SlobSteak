using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using SlobSteak.Application.Identity;

namespace SlobSteak.Api.Bootstrap;

/// <summary>
/// Startup-Hook (US-005): ruft <see cref="SeedAdminService.SeedAsync"/> beim Hoststart in einem
/// eigenen DI-Scope auf (der Application Service hängt vom gescopeten <c>IUserRepository</c> ab,
/// dieser Hosted Service selbst ist Singleton). Wirft der Service eine Exception (fehlende
/// Seed-Konfiguration), bricht der Hoststart mit dieser Fehlermeldung ab — kein stiller Fehlschlag
/// (Akzeptanzkriterium 3 der Story).
/// </summary>
public sealed class SeedAdminHostedService : IHostedService
{
    private readonly IServiceProvider _serviceProvider;

    public SeedAdminHostedService(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var seedAdminService = scope.ServiceProvider.GetRequiredService<SeedAdminService>();
        await seedAdminService.SeedAsync(cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
