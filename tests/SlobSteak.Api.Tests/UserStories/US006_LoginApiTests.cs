using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SlobSteak.Api.Tests.Persistence;
using SlobSteak.Domain.Identity;
using SlobSteak.Infrastructure.Persistence;

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-006 (Login-API mit Session/Token-Ausstellung). Prüft
/// ausschließlich die in <c>docs/usecases/US-006-login-api.md</c> gelisteten Akzeptanzkriterien,
/// ein <see cref="FactAttribute"/>/<see cref="TheoryAttribute"/> je Kriterium, in derselben
/// Reihenfolge wie im Story-Dokument, über <see cref="WebApplicationFactory{TEntryPoint}"/> gegen
/// eine echte Testcontainers-PostgreSQL-Instanz.
///
/// <para>
/// Jeder Fact/Theory-Fall seedet seinen eigenen Nutzer mit einer per <see cref="Guid"/>
/// eindeutigen E-Mail-Adresse: Diese Klasse teilt sich per <see cref="PostgresCollection"/> die
/// Datenbank mit den übrigen Testklassen (u. a. <see cref="Auth.AuthControllerTests"/>), ein
/// fixer, in <c>InitializeAsync</c> vorab angelegter Nutzer würde bei jeder der mehreren
/// Klasseninstanzen (xUnit instanziiert die Testklasse pro Fact/Theory-Fall neu) einen
/// Unique-Constraint-Verstoß auf <c>users.email</c> auslösen.
/// </para>
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US006_LoginApiTests : IAsyncLifetime
{
    private const string TestSigningKey = "test-jwt-signing-key-for-story-tests-only-12345";
    private const string Password = "correct-horse";

    private readonly SlobSteakApiFactory _factory;

    public US006_LoginApiTests(PostgresContainerFixture postgres)
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

    // AC 1: POST /api/v1/auth/login mit gültigen Zugangsdaten liefert 200 OK mit einem
    // Session-Token (JWT) sowie must_change_password-Flag im Response-Body.
    [Fact]
    public async Task AC1_ValidCredentials_Returns200_WithTokenAndMustChangePasswordFlag()
    {
        var email = await SeedUserAsync();
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password = Password });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("token").GetString().Should().NotBeNullOrWhiteSpace();
        body.GetProperty("mustChangePassword").GetBoolean().Should().BeTrue();
    }

    // AC 2: POST /api/v1/auth/login mit unbekannter E-Mail oder falschem Passwort liefert 401
    // Unauthorized mit generischer Fehlermeldung INVALID_CREDENTIALS (kein Hinweis, ob E-Mail
    // oder Passwort falsch war).
    [Fact]
    public async Task AC2_UnknownEmail_Returns401_WithGenericInvalidCredentialsError()
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new { email = $"unbekannt-{Guid.NewGuid():N}@example.com", password = Password });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("error").GetString().Should().Be("INVALID_CREDENTIALS");
    }

    [Fact]
    public async Task AC2_WrongPassword_Returns401_WithGenericInvalidCredentialsError()
    {
        var email = await SeedUserAsync();
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password = "falsches-passwort" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("error").GetString().Should().Be("INVALID_CREDENTIALS");
    }

    // AC 3: POST /api/v1/auth/login mit fehlenden Pflichtfeldern liefert 400 Bad Request.
    [Theory]
    [InlineData(null, Password)]
    [InlineData("someone@example.com", null)]
    public async Task AC3_MissingRequiredFields_Returns400(string? email, string? password)
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // AC 4: Ausgestelltes Token/Session enthält user_id und is_system_admin, jedoch keine
    // projektbezogenen Rollen.
    [Fact]
    public async Task AC4_IssuedToken_ContainsUserIdAndIsSystemAdmin_ButNoProjectRoles()
    {
        var email = await SeedUserAsync();
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password = Password });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var token = body.GetProperty("token").GetString();

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        jwt.Claims.Should().Contain(c => c.Type == "sub");
        jwt.Claims.Should().Contain(c => c.Type == "isSystemAdmin");
        jwt.Claims.Should().NotContain(c => c.Type.Contains("role", StringComparison.OrdinalIgnoreCase)
            || c.Type.Contains("project", StringComparison.OrdinalIgnoreCase));
    }

    // AC 5: Integrationstest deckt: gültiger Login, falsches Passwort, unbekannte E-Mail, leerer
    // Request-Body. (Gültiger Login/falsches Passwort/unbekannte E-Mail bereits durch AC1/AC2
    // abgedeckt — hier zusätzlich explizit der leere Request-Body.)
    [Fact]
    public async Task AC5_EmptyRequestBody_Returns400()
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsync(
            "/api/v1/auth/login",
            new StringContent(string.Empty, Encoding.UTF8, "application/json"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    private async Task<string> SeedUserAsync()
    {
        var email = $"us006-user-{Guid.NewGuid():N}@example.com";

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        dbContext.Users.Add(User.Create("Story-Test-Nutzer", email, Password));
        await dbContext.SaveChangesAsync();

        return email;
    }
}
