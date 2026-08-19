using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Stakeholders;
using SlobSteak.Infrastructure.Persistence;
using SlobSteak.Infrastructure.Persistence.Identity;
using SlobSteak.Infrastructure.Persistence.Projects;
using SlobSteak.Infrastructure.Persistence.Stakeholders;

namespace SlobSteak.Infrastructure;

/// <summary>
/// Registriert die Infrastructure-Schicht (<see cref="SlobSteakDbContext"/> gegen PostgreSQL
/// sowie die Repository-Implementierungen für die von der Domain definierten
/// Repository-Interfaces) in der Composition Root (<c>SlobSteak.Api/Program.cs</c>).
/// </summary>
public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // Bewusst kein eager Guard gegen einen fehlenden Connection-String hier: Diese Methode
        // läuft bei jedem Hoststart, auch in Kontexten ohne echte Datenbank (z. B.
        // WebApplicationFactory-basierte Tests, die nie mit SlobSteakDbContext interagieren, wie
        // der Health-Check-Test aus US-001). Ein fehlender/leerer Connection-String führt erst
        // beim tatsächlichen Verbindungsaufbau (z. B. `Database.Migrate()` in Program.cs, nur im
        // Development-Environment) zu einem aussagekräftigen Npgsql-Fehler.
        var connectionString = configuration.GetConnectionString("Default") ?? string.Empty;

        services.AddDbContext<SlobSteakDbContext>(options =>
            options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention());

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IProjectRepository, ProjectRepository>();
        services.AddScoped<IProjectOverviewQuery, ProjectOverviewQuery>();
        services.AddScoped<IStakeholderRepository, StakeholderRepository>();
        services.AddScoped<IStakeholderListQuery, StakeholderListQuery>();

        return services;
    }
}
