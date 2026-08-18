using Microsoft.Extensions.DependencyInjection;
using SlobSteak.Application.Identity;
using SlobSteak.Application.Projects;

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
        services.AddScoped<CreateUserService>();
        services.AddScoped<ResetPasswordService>();
        services.AddScoped<CreateProjectService>();

        return services;
    }
}
