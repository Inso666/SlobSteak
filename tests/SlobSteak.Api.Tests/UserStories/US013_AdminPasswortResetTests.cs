using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SlobSteak.Api.Auth;
using SlobSteak.Api.Tests.Persistence;
using SlobSteak.Domain.Identity;
using SlobSteak.Infrastructure.Persistence;

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-013 (Admin-API: Passwort-Reset für Nutzer). Prüft ausschließlich
/// die in <c>docs/usecases/US-013-admin-passwort-reset.md</c> gelisteten Akzeptanzkriterien, ein
/// <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie im Story-Dokument, über
/// eine echte Testcontainers-PostgreSQL-Instanz.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US013_AdminPasswortResetTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us013-story-tests-only!";
    private const string OriginalPassword = "correct-horse";

    private readonly SlobSteakApiFactory _factory;

    public US013_AdminPasswortResetTests(PostgresContainerFixture postgres)
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

    // AC 1: POST /api/v1/admin/users/{userId}/reset-password mit neuem temporärem Passwort
    // liefert 200 OK und setzt must_change_password = true für den Zielnutzer.
    [Fact]
    public async Task AC1_ValidReset_Returns200_SetsMustChangePasswordTrue()
    {
        var userId = await CreateTargetUserAsync();
        using var client = AdminClient();

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/users/{userId}/reset-password", new { temporaryPassword = "temporary-password-123" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        var user = await dbContext.Users.SingleAsync(u => u.Id == userId);
        user.MustChangePassword.Should().BeTrue();
        user.VerifyPassword("temporary-password-123").Should().BeTrue();
    }

    // AC 2: Endpoint liefert 404 Not Found, wenn userId nicht existiert.
    [Fact]
    public async Task AC2_UnknownUserId_Returns404()
    {
        using var client = AdminClient();

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/users/{Guid.NewGuid()}/reset-password", new { temporaryPassword = "temporary-password-123" });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // AC 3: Endpoint ist ausschließlich für Systemadmins erreichbar (403 sonst).
    [Fact]
    public async Task AC3_AsNonAdmin_Returns403()
    {
        var userId = await CreateTargetUserAsync();
        using var client = NonAdminClient();

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/users/{userId}/reset-password", new { temporaryPassword = "temporary-password-123" });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // AC 4: Integrationstest deckt erfolgreichen Reset und anschließenden erzwungenen
    // Passwortwechsel beim nächsten Login des betroffenen Nutzers ab.
    [Fact]
    public async Task AC4_AfterReset_NextLogin_ReportsMustChangePasswordTrue()
    {
        var (userId, email) = await CreateTargetUserWithEmailAsync();
        using var adminClient = AdminClient();

        await adminClient.PostAsJsonAsync(
            $"/api/v1/admin/users/{userId}/reset-password", new { temporaryPassword = "temporary-password-123" });

        using var anonymousClient = _factory.CreateClient();
        var loginResponse = await anonymousClient.PostAsJsonAsync(
            "/api/v1/auth/login", new { email, password = "temporary-password-123" });

        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await loginResponse.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        body.GetProperty("mustChangePassword").GetBoolean().Should().BeTrue();
    }

    private async Task<Guid> CreateTargetUserAsync() => (await CreateTargetUserWithEmailAsync()).UserId;

    private async Task<(Guid UserId, string Email)> CreateTargetUserWithEmailAsync()
    {
        var email = $"us013-target-{Guid.NewGuid():N}@example.com";

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        var user = User.Create("Zielnutzer", email, OriginalPassword);
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        return (user.Id, email);
    }

    private HttpClient AdminClient() => AuthenticatedClient(isSystemAdmin: true);

    private HttpClient NonAdminClient() => AuthenticatedClient(isSystemAdmin: false);

    private HttpClient AuthenticatedClient(bool isSystemAdmin)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { [JwtSettings.SigningKeyConfigurationKey] = SigningKey })
            .Build();
        var token = new JwtTokenGenerator(configuration).GenerateToken(Guid.NewGuid(), isSystemAdmin);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}
