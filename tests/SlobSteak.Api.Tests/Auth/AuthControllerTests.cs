using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SlobSteak.Api.Tests.Persistence;
using SlobSteak.Domain.Identity;
using SlobSteak.Infrastructure.Persistence;

namespace SlobSteak.Api.Tests.Auth;

/// <summary>
/// Integrationstests für <c>POST /api/v1/auth/login</c> (US-006) über eine echte
/// Testcontainers-PostgreSQL-Instanz — ergänzend zum dedizierten Story-Test
/// <c>tests/SlobSteak.Api.Tests/UserStories/US006_LoginApiTests.cs</c>: hier liegt der Fokus auf
/// technischen Details des ausgestellten Tokens (Claims, keine Projektrollen) statt auf den
/// Akzeptanzkriterien selbst.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class AuthControllerTests : IAsyncLifetime
{
    private const string TestSigningKey = "test-jwt-signing-key-for-integration-tests-only!";
    private const string Password = "correct-horse";

    private readonly SlobSteakApiFactory _factory;

    public AuthControllerTests(PostgresContainerFixture postgres)
    {
        _factory = SlobSteakApiFactory.WithConnectionString(
            postgres.ConnectionString,
            new Dictionary<string, string?> { ["JWT_SIGNING_KEY"] = TestSigningKey });
    }

    public async Task InitializeAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        await dbContext.Database.MigrateAsync();
    }

    public Task DisposeAsync()
    {
        _factory.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsCamelCaseJsonBody()
    {
        await SeedUserAsync("camelcase@example.com", isSystemAdmin: false);
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { email = "camelcase@example.com", password = Password });
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();

        json.TryGetProperty("token", out _).Should().BeTrue();
        json.TryGetProperty("mustChangePassword", out _).Should().BeTrue();
    }

    [Fact]
    public async Task Login_WithValidCredentials_TokenContainsUserIdAndIsSystemAdmin_ButNoProjectRoleClaim()
    {
        var user = await SeedUserAsync("claims@example.com", isSystemAdmin: true);
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { email = "claims@example.com", password = Password });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var token = body.GetProperty("token").GetString();

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        jwt.Claims.Should().Contain(c => c.Type == "sub" && c.Value == user.Id.ToString());
        jwt.Claims.Should().Contain(c => c.Type == "isSystemAdmin" && c.Value == "true");
        jwt.Claims.Should().NotContain(c => c.Type.Contains("role", StringComparison.OrdinalIgnoreCase));
    }

    private async Task<User> SeedUserAsync(string email, bool isSystemAdmin)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        var user = isSystemAdmin
            ? User.CreateSystemAdmin("Admin", email, Password)
            : User.Create("Nutzer", email, Password);
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();
        return user;
    }
}
