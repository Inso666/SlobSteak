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

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-012 (Admin-API: Nutzer anlegen). Prüft ausschließlich die in
/// <c>docs/usecases/US-012-admin-nutzer-anlegen.md</c> gelisteten Akzeptanzkriterien, ein
/// <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie im Story-Dokument, über
/// eine echte Testcontainers-PostgreSQL-Instanz.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US012_AdminNutzerAnlegenTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us012-story-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public US012_AdminNutzerAnlegenTests(PostgresContainerFixture postgres)
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

    // AC 1: POST /api/v1/admin/users mit name, email, initialPassword liefert für Systemadmins
    // 201 Created mit dem neu angelegten Nutzer (ohne password_hash im Response-Body).
    [Fact]
    public async Task AC1_AsSystemAdmin_ValidRequest_Returns201_WithoutPasswordHash()
    {
        using var client = AdminClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/admin/users",
            new { name = "Neuer Nutzer", email = $"user-{Guid.NewGuid():N}@example.com", initialPassword = "initial-pass" });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("passwordHash", out _).Should().BeFalse();
        body.TryGetProperty("password_hash", out _).Should().BeFalse();
    }

    // AC 2: Erzeugter Nutzer hat must_change_password = true.
    [Fact]
    public async Task AC2_CreatedUser_HasMustChangePasswordTrue()
    {
        using var client = AdminClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/admin/users",
            new { name = "Neuer Nutzer", email = $"user-{Guid.NewGuid():N}@example.com", initialPassword = "initial-pass" });

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("mustChangePassword").GetBoolean().Should().BeTrue();
    }

    // AC 3: POST /api/v1/admin/users mit bereits vergebener E-Mail liefert 409 Conflict mit
    // {"error":"EMAIL_ALREADY_IN_USE"}.
    [Fact]
    public async Task AC3_DuplicateEmail_Returns409_WithEmailAlreadyInUseError()
    {
        using var client = AdminClient();
        var email = $"user-{Guid.NewGuid():N}@example.com";

        var first = await client.PostAsJsonAsync("/api/v1/admin/users", new { name = "Erster", email, initialPassword = "initial-pass" });
        first.StatusCode.Should().Be(HttpStatusCode.Created);

        var second = await client.PostAsJsonAsync("/api/v1/admin/users", new { name = "Zweiter", email, initialPassword = "initial-pass" });

        second.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await second.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("error").GetString().Should().Be("EMAIL_ALREADY_IN_USE");
    }

    // AC 4: POST /api/v1/admin/users von einem Nicht-Admin liefert 403 Forbidden (durchgesetzt
    // durch requireSystemAdmin() aus US-007).
    [Fact]
    public async Task AC4_AsNonAdmin_Returns403()
    {
        using var client = NonAdminClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/admin/users",
            new { name = "Neuer Nutzer", email = $"user-{Guid.NewGuid():N}@example.com", initialPassword = "initial-pass" });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // AC 5: Integrationstest deckt erfolgreiche Anlage, Duplikat-E-Mail, Zugriff ohne Admin-Rolle
    // ab — hier zusätzlich als ein zusammenhängender End-to-End-Ablauf gegen dieselbe Datenbank
    // (ergänzend zu den isolierten Einzel-Facts AC1/AC3/AC4).
    [Fact]
    public async Task AC5_EndToEndFlow_SuccessfulCreation_DuplicateEmail_AndNonAdminAccess()
    {
        var email = $"user-{Guid.NewGuid():N}@example.com";

        using var nonAdminClient = NonAdminClient();
        var deniedResponse = await nonAdminClient.PostAsJsonAsync(
            "/api/v1/admin/users", new { name = "Nutzer", email, initialPassword = "initial-pass" });
        deniedResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        using var adminClient = AdminClient();
        var createdResponse = await adminClient.PostAsJsonAsync(
            "/api/v1/admin/users", new { name = "Nutzer", email, initialPassword = "initial-pass" });
        createdResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var duplicateResponse = await adminClient.PostAsJsonAsync(
            "/api/v1/admin/users", new { name = "Nutzer Zwei", email, initialPassword = "initial-pass" });
        duplicateResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    private HttpClient AdminClient() => AuthenticatedClient(isSystemAdmin: true);

    private HttpClient NonAdminClient() => AuthenticatedClient(isSystemAdmin: false);

    private HttpClient AuthenticatedClient(bool isSystemAdmin)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { [JwtSettings.SigningKeyConfigurationKey] = SigningKey })
            .Build();
        var tokenGenerator = new JwtTokenGenerator(configuration);
        var token = tokenGenerator.GenerateToken(Guid.NewGuid(), isSystemAdmin);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}
