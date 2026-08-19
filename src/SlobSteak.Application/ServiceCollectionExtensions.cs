using Microsoft.Extensions.DependencyInjection;
using SlobSteak.Application.Identity;
using SlobSteak.Application.Projects;
using SlobSteak.Application.Stakeholders;

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
        services.AddScoped<ListUsersService>();
        services.AddScoped<CreateProjectService>();
        services.AddScoped<ListProjectsService>();
        services.AddScoped<AssignProjectMembershipService>();
        services.AddScoped<ListProjectMembershipsService>();
        services.AddScoped<CreateStakeholderService>();

        return services;
    }
}
