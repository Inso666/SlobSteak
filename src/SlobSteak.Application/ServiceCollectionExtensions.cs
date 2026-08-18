using Microsoft.Extensions.DependencyInjection;
using SlobSteak.Application.Identity;

namespace SlobSteak.Application;

/// <summary>
/// Registriert die Application-Schicht (Use-Case-orchestrierende Services) in der Composition Root
/// (<c>SlobSteak.Api/Program.cs</c>).
/// </summary>
public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<SeedAdminService>();
        services.AddScoped<LoginService>();
        services.AddScoped<ChangePasswordService>();

        return services;
    }
}
