using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.EntityFrameworkCore;
using SlobSteak.Infrastructure.Persistence;

namespace SlobSteak.Api.Tests;

/// <summary>
/// Gemeinsame <see cref="WebApplicationFactory{TEntryPoint}"/> für alle Integrationstests dieses
/// Projekts. Setzt die Hosting-Umgebung explizit auf <c>"Testing"</c> (statt den
/// <see cref="WebApplicationFactory{TEntryPoint}"/>-Standardwert <c>"Development"</c> zu
/// übernehmen), damit der in <c>Program.cs</c> auf <c>IsDevelopment()</c> gegate automatische
/// <c>dbContext.Database.Migrate()</c>-Aufruf beim Teststart <b>nicht</b> ungewollt gegen eine
/// nicht vorhandene/nicht erreichbare Datenbank läuft (Regression aus US-003 gegenüber dem
/// DB-losen Health-Check-Test aus US-001). Tests, die eine echte Datenbank benötigen, steuern
/// Migration/Schema explizit selbst (z. B. über einen Testcontainers-Fixture), unabhängig vom
/// Hosting-Environment-Namen.
/// </summary>
public class SlobSteakApiFactory : WebApplicationFactory<Program>
{
    private readonly string? _connectionStringOverride;
    private readonly IReadOnlyDictionary<string, string?>? _additionalConfiguration;
    private readonly string _environmentName;

    /// <summary>Parameterloser Konstruktor, benötigt für die Aktivierung über xUnits
    /// <see cref="IClassFixture{TFixture}"/> (keine Datenbank-Interaktion). xUnit lässt pro
    /// Fixture-Typ nur einen einzigen public Konstruktor zu — Tests gegen eine echte
    /// (Testcontainers-)PostgreSQL-Instanz verwenden daher <see cref="WithConnectionString"/>.</summary>
    public SlobSteakApiFactory()
    {
        _environmentName = "Testing";
    }

    private SlobSteakApiFactory(
        string connectionStringOverride,
        IReadOnlyDictionary<string, string?>? additionalConfiguration,
        string environmentName)
    {
        _connectionStringOverride = connectionStringOverride;
        _additionalConfiguration = additionalConfiguration;
        _environmentName = environmentName;
    }

    /// <summary>Erstellt eine Factory, deren <see cref="SlobSteakDbContext"/>-Registrierung durch
    /// <paramref name="connectionString"/> ersetzt ist (z. B. eine Testcontainers-PostgreSQL-Instanz).
    /// <paramref name="additionalConfiguration"/> überschreibt/ergänzt optional einzelne
    /// Konfigurationswerte (z. B. <c>SEED_ADMIN_EMAIL</c>/<c>SEED_ADMIN_PASSWORD</c> für US-005),
    /// ohne echte Prozess-Umgebungsvariablen zu setzen. <paramref name="environmentName"/>
    /// überschreibt optional das standardmäßig verwendete Hosting-Environment <c>"Testing"</c> —
    /// benötigt von US-049, um den echten, nur unter <c>IsDevelopment()</c> laufenden
    /// Migrations-/Seed-Admin-Startpfad aus <c>Program.cs</c> gezielt gegen eine echte
    /// Testcontainers-Instanz zu durchlaufen (statt des sonst für DB-lose Tests bewusst
    /// übersprungenen Pfads, siehe Klassendokumentation oben).</summary>
    public static SlobSteakApiFactory WithConnectionString(
        string connectionString,
        IReadOnlyDictionary<string, string?>? additionalConfiguration = null,
        string environmentName = "Testing") =>
        new(connectionString, additionalConfiguration, environmentName);

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(_environmentName);

        if (_additionalConfiguration is not null)
        {
            builder.ConfigureAppConfiguration((_, configurationBuilder) =>
                configurationBuilder.AddInMemoryCollection(_additionalConfiguration!));
        }

        if (_connectionStringOverride is not null)
        {
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<DbContextOptions<SlobSteakDbContext>>();
                services.AddDbContext<SlobSteakDbContext>(options =>
                    options.UseNpgsql(_connectionStringOverride).UseSnakeCaseNamingConvention());
            });
        }
    }
}
