using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SlobSteak.Api.Auth;
using SlobSteak.Api.Tests.Persistence;
using SlobSteak.Infrastructure.Persistence;

namespace SlobSteak.Api.Tests.Admin;

/// <summary>
/// Integrationstests für <c>POST /api/v1/admin/users</c> (US-012) über eine echte
/// Testcontainers-PostgreSQL-Instanz — ergänzend zum dedizierten Story-Test
/// <c>US012_AdminNutzerAnlegenTests</c>: hier liegt der Fokus auf Details des Response-Contracts
/// (camelCase, Feldvollständigkeit) und der Request-Validierung, nicht auf den
/// Akzeptanzkriterien selbst.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class AdminUserControllerTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-admin-user-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public AdminUserControllerTests(PostgresContainerFixture postgres)
    {
        _factory = SlobSteakApiFactory.WithConnectionString(
            postgres.ConnectionString,
            new Dictionary<string, string?> { [JwtSettings.SigningKeyConfigurationKey] = SigningKey });
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
    public async Task CreateUser_ValidRequest_ReturnsCamelCaseBodyWithAllExpectedFields()
    {
        using var client = AdminClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/admin/users",
            new { name = "Neuer Nutzer", email = $"user-{Guid.NewGuid():N}@example.com", initialPassword = "initial-pass" });

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("id", out _).Should().BeTrue();
        body.TryGetProperty("name", out _).Should().BeTrue();
        body.TryGetProperty("email", out _).Should().BeTrue();
        body.TryGetProperty("isSystemAdmin", out _).Should().BeTrue();
        body.TryGetProperty("mustChangePassword", out _).Should().BeTrue();
        body.TryGetProperty("createdAt", out _).Should().BeTrue();
        body.GetProperty("isSystemAdmin").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task CreateUser_MissingRequiredFields_Returns400()
    {
        using var client = AdminClient();

        var response = await client.PostAsJsonAsync("/api/v1/admin/users", new { });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateUser_InitialPasswordTooShort_Returns400()
    {
        using var client = AdminClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/admin/users",
            new { name = "Neuer Nutzer", email = $"user-{Guid.NewGuid():N}@example.com", initialPassword = "short" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateUser_WithoutToken_Returns401()
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/admin/users",
            new { name = "Neuer Nutzer", email = $"user-{Guid.NewGuid():N}@example.com", initialPassword = "initial-pass" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private HttpClient AdminClient()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { [JwtSettings.SigningKeyConfigurationKey] = SigningKey })
            .Build();
        var token = new JwtTokenGenerator(configuration).GenerateToken(Guid.NewGuid(), isSystemAdmin: true);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}
