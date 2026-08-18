using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
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

    /// <summary>Parameterloser Konstruktor, benötigt für die Aktivierung über xUnits
    /// <see cref="IClassFixture{TFixture}"/> (keine Datenbank-Interaktion). xUnit lässt pro
    /// Fixture-Typ nur einen einzigen public Konstruktor zu — Tests gegen eine echte
    /// (Testcontainers-)PostgreSQL-Instanz verwenden daher <see cref="WithConnectionString"/>.</summary>
    public SlobSteakApiFactory()
    {
    }

    private SlobSteakApiFactory(string connectionStringOverride)
    {
        _connectionStringOverride = connectionStringOverride;
    }

    /// <summary>Erstellt eine Factory, deren <see cref="SlobSteakDbContext"/>-Registrierung durch
    /// <paramref name="connectionString"/> ersetzt ist (z. B. eine Testcontainers-PostgreSQL-Instanz).</summary>
    public static SlobSteakApiFactory WithConnectionString(string connectionString) => new(connectionString);

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

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
