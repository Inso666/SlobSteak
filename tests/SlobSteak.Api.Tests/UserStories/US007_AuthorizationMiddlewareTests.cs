using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using SlobSteak.Api.Auth;
using SlobSteak.Api.Authorization;
using SlobSteak.Application.Identity;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.ValueObjects;
using SlobSteak.Infrastructure.Persistence;
using SlobSteak.Infrastructure.Persistence.Projects;
using Testcontainers.PostgreSql;

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-007 (Rollenbasierte Authorization-Middleware). Prüft
/// ausschließlich die in <c>docs/usecases/US-007-authorization-middleware.md</c> gelisteten
/// Akzeptanzkriterien, ein <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie
/// im Story-Dokument.
///
/// <para>
/// Da diese Story ausschließlich Cross-Cutting-Infrastruktur liefert und noch keine fachlichen
/// Endpunkte im Backlog existieren, an die die Policies real gebunden werden könnten, baut dieser
/// Test einen eigenständigen, minimalen <see cref="TestServer"/> mit genau der Authentication-/
/// Authorization-Verdrahtung aus <c>Program.cs</c> (JWT Bearer + beide Policies + Handler +
/// <see cref="JsonAuthorizationMiddlewareResultHandler"/>) und zwei Test-Endpunkten auf — so lässt
/// sich das tatsächliche HTTP-Verhalten (401/403 inkl. Body) verifizieren, ohne die
/// Produktionspipeline in <c>Program.cs</c> für Tests zu verändern. Zusätzliche, granularere
/// Handler-Unit-Tests liegen in <c>tests/SlobSteak.Api.Tests/Authorization/</c>.
/// </para>
/// </summary>
public sealed class US007_AuthorizationMiddlewareTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us007-story-tests-only!";

    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:16-alpine")
        .WithDatabase("slobsteak_test")
        .WithUsername("slobsteak")
        .WithPassword("slobsteak")
        .Build();

    private IHost? _host;
    private JwtTokenGenerator? _tokenGenerator;

    public async Task InitializeAsync()
    {
        await _container.StartAsync();

        var optionsBuilder = new DbContextOptionsBuilder<SlobSteakDbContext>()
            .UseNpgsql(_container.GetConnectionString())
            .UseSnakeCaseNamingConvention();
        using (var migrationContext = new SlobSteakDbContext(optionsBuilder.Options))
        {
            await migrationContext.Database.MigrateAsync();
        }

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { [JwtSettings.SigningKeyConfigurationKey] = SigningKey })
            .Build();
        _tokenGenerator = new JwtTokenGenerator(configuration);

        _host = await new HostBuilder()
            .ConfigureWebHost(webBuilder =>
            {
                webBuilder.UseTestServer();
                webBuilder.ConfigureServices(services =>
                {
                    services.AddRouting();
                    services.AddHttpContextAccessor();
                    services.AddDbContext<SlobSteakDbContext>(o => o
                        .UseNpgsql(_container.GetConnectionString())
                        .UseSnakeCaseNamingConvention());
                    services.AddScoped<IProjectRepository, ProjectRepository>();

                    services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                        .AddJwtBearer(options =>
                        {
                            options.MapInboundClaims = false;
                            options.TokenValidationParameters = new TokenValidationParameters
                            {
                                ValidateIssuer = true,
                                ValidIssuer = JwtSettings.Issuer,
                                ValidateAudience = true,
                                ValidAudience = JwtSettings.Audience,
                                ValidateLifetime = true,
                                ValidateIssuerSigningKey = true,
                                IssuerSigningKey = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(SigningKey)),
                            };
                        });

                    services.AddAuthorization(options =>
                        options.AddPolicy(AuthorizationPolicies.SystemAdmin, p => p.Requirements.Add(new SystemAdminRequirement())));
                    services.AddSingleton<IAuthorizationHandler, SystemAdminAuthorizationHandler>();
                    services.AddScoped<IAuthorizationHandler, ProjectRoleAuthorizationHandler>();
                    services.AddSingleton<IAuthorizationMiddlewareResultHandler, JsonAuthorizationMiddlewareResultHandler>();
                });
                webBuilder.Configure(app =>
                {
                    app.UseRouting();
                    app.UseAuthentication();
                    app.UseAuthorization();
                    app.UseEndpoints(endpoints =>
                    {
                        endpoints.MapGet("/test/admin-only", () => Results.Ok())
                            .RequireAuthorization(AuthorizationPolicies.SystemAdmin);

                        endpoints.MapGet("/test/project/{projectId}/pl-only", () => Results.Ok())
                            .RequireAuthorization(policy => policy.Requirements.Add(new ProjectRoleRequirement(ProjectRole.PL)));
                    });
                });
            })
            .StartAsync();
    }

    public async Task DisposeAsync()
    {
        if (_host is not null)
        {
            await _host.StopAsync();
            _host.Dispose();
        }

        await _container.DisposeAsync();
    }

    // AC 1: ProjectRoleRequirement + ProjectRoleAuthorizationHandler lehnt Requests ohne passende
    // ProjectMembership.Role für die über die Route referenzierte projectId mit 403 Forbidden und
    // Body {"error":"FORBIDDEN"} ab.
    [Fact]
    public async Task AC1_ProjectRolePolicy_WithoutMatchingRole_Returns403WithForbiddenErrorBody()
    {
        var (project, userId) = await CreateProjectWithMemberAsync(ProjectRole.Coreteam);
        using var client = CreateAuthenticatedClient(userId, isSystemAdmin: false);

        var response = await client.GetAsync($"/test/project/{project.Id}/pl-only");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("error").GetString().Should().Be("FORBIDDEN");
    }

    // AC 2: Policy RequireSystemAdmin (via SystemAdminRequirement) lehnt Requests ohne
    // IsSystemAdmin = true mit 403 Forbidden ab.
    [Fact]
    public async Task AC2_SystemAdminPolicy_WithoutIsSystemAdmin_Returns403()
    {
        using var client = CreateAuthenticatedClient(Guid.NewGuid(), isSystemAdmin: false);

        var response = await client.GetAsync("/test/admin-only");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // AC 3: Ein Systemadmin ohne zusätzliche ProjectMembership erhält bei projektbezogenen,
    // fachlichen Endpunkten 403 Forbidden.
    [Fact]
    public async Task AC3_SystemAdminWithoutProjectMembership_OnProjectRoleEndpoint_Returns403()
    {
        var project = await CreateProjectAsync();
        using var client = CreateAuthenticatedClient(Guid.NewGuid(), isSystemAdmin: true);

        var response = await client.GetAsync($"/test/project/{project.Id}/pl-only");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // AC 4: Requests ohne gültiges JWT-Bearer-Token liefern 401 Unauthorized, bevor die
    // Authorization-Handler greifen.
    [Fact]
    public async Task AC4_RequestsWithoutValidToken_Return401()
    {
        using var clientWithoutToken = _host!.GetTestClient();
        var responseWithoutToken = await clientWithoutToken.GetAsync("/test/admin-only");
        responseWithoutToken.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        using var clientWithInvalidToken = _host!.GetTestClient();
        clientWithInvalidToken.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", "not-a-valid-jwt");
        var responseWithInvalidToken = await clientWithInvalidToken.GetAsync("/test/admin-only");
        responseWithInvalidToken.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // AC 5: Die für die Autorisierung nötigen Claims (sub/userId, isSystemAdmin) stammen aus dem
    // JWT; ProjectMembership.Role wird pro Request aus der Datenbank nachgeladen (nicht aus dem
    // Token), damit ein Rollenwechsel ohne Re-Login sofort wirksam ist.
    [Fact]
    public async Task AC5_RoleChange_WithoutReissuingToken_TakesEffectImmediately()
    {
        var (project, userId) = await CreateProjectWithMemberAsync(ProjectRole.Coreteam);
        using var client = CreateAuthenticatedClient(userId, isSystemAdmin: false);

        var beforeChange = await client.GetAsync($"/test/project/{project.Id}/pl-only");
        beforeChange.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        await ChangeMemberRoleAsync(project.Id, userId, ProjectRole.PL);

        var afterChange = await client.GetAsync($"/test/project/{project.Id}/pl-only");
        afterChange.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // AC 6: Unit-Tests decken alle Kombinationen aus Abschnitt 2.3 exemplarisch ab: PL darf
    // Stakeholder löschen, Coreteam darf nicht, User darf keine Assessments lesen — siehe
    // ProjectRolePolicyTests (Application.Tests) und ProjectRoleAuthorizationHandlerTests
    // (Api.Tests/Authorization), zusätzlich hier end-to-end über HTTP verifiziert.
    [Fact]
    public async Task AC6_PermissionMatrixExample_PLCanAccess_CoreteamCannot()
    {
        var (project, plUserId) = await CreateProjectWithMemberAsync(ProjectRole.PL);
        using var plClient = CreateAuthenticatedClient(plUserId, isSystemAdmin: false);
        var plResponse = await plClient.GetAsync($"/test/project/{project.Id}/pl-only");
        plResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var coreteamUserId = Guid.NewGuid();
        await AssignMemberAsync(project.Id, coreteamUserId, ProjectRole.Coreteam);
        using var coreteamClient = CreateAuthenticatedClient(coreteamUserId, isSystemAdmin: false);
        var coreteamResponse = await coreteamClient.GetAsync($"/test/project/{project.Id}/pl-only");
        coreteamResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    private HttpClient CreateAuthenticatedClient(Guid userId, bool isSystemAdmin)
    {
        var client = _host!.GetTestClient();
        var token = _tokenGenerator!.GenerateToken(userId, isSystemAdmin);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private async Task<Project> CreateProjectAsync()
    {
        using var scope = _host!.Services.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IProjectRepository>();
        var project = Project.Create($"Projekt-{Guid.NewGuid():N}", null);
        await repository.SaveAsync(project);
        return project;
    }

    private async Task<(Project Project, Guid UserId)> CreateProjectWithMemberAsync(ProjectRole role)
    {
        var project = await CreateProjectAsync();
        var userId = Guid.NewGuid();
        await AssignMemberAsync(project.Id, userId, role);
        return (project, userId);
    }

    private async Task AssignMemberAsync(Guid projectId, Guid userId, ProjectRole role)
    {
        using var scope = _host!.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        var repository = scope.ServiceProvider.GetRequiredService<IProjectRepository>();

        var user = new User(
            userId, "Mitglied", new Email($"member-{Guid.NewGuid():N}@example.com"),
            "hash", false, false, DateTimeOffset.UtcNow);
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        var project = await repository.FindByIdAsync(projectId);
        project!.AssignMember(userId, role);
        await repository.SaveAsync(project);
    }

    private async Task ChangeMemberRoleAsync(Guid projectId, Guid userId, ProjectRole newRole)
    {
        using var scope = _host!.Services.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IProjectRepository>();

        var project = await repository.FindByIdAsync(projectId);
        project!.ChangeMemberRole(userId, newRole);
        await repository.SaveAsync(project);
    }
}
