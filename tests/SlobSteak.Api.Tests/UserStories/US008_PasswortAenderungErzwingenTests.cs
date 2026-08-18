using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SlobSteak.Api.Tests.Persistence;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Shared.ValueObjects;
using SlobSteak.Infrastructure.Persistence;

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-008 (Erzwungene Passwortänderung nach Erst-Login). Prüft
/// ausschließlich die in <c>docs/usecases/US-008-passwort-aenderung-erzwingen.md</c> gelisteten
/// (backend-seitigen) Akzeptanzkriterien, ein <see cref="FactAttribute"/> je Kriterium, in
/// derselben Reihenfolge wie im Story-Dokument, über eine echte Testcontainers-PostgreSQL-Instanz.
///
/// <para>
/// AC 2/AC 4 referenzieren in der Story-Prosa <c>GET /api/v1/projects</c> — dieser Endpoint
/// existiert im Backlog erst ab Phase 2 (Admin-/Projekt-APIs) und ist zum Zeitpunkt dieser Story
/// noch nicht implementiert. Als PRD-/CLAUDE.md-konformste Interpretation (Abschnitt 4) wird
/// stattdessen der bereits real existierende, nicht unter <c>/api/v1/auth</c> liegende
/// Health-Check-Endpoint <c>GET /api/v1/health</c> als Zielendpunkt verwendet — fachlich
/// äquivalent für den Nachweis, dass die Middleware pauschal jeden Endpoint außerhalb
/// <c>/api/v1/auth/*</c> blockiert, unabhängig von dessen eigener Autorisierungsanforderung.
/// AC 3 (Frontend-Modal) wird nicht hier, sondern durch die Angular-Komponententests der
/// <c>password-change-modal</c>-Komponente abgedeckt.
/// </para>
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US008_PasswortAenderungErzwingenTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us008-story-tests-only!";
    private const string InitialPassword = "correct-horse";

    private readonly SlobSteakApiFactory _factory;

    public US008_PasswortAenderungErzwingenTests(PostgresContainerFixture postgres)
    {
        _factory = SlobSteakApiFactory.WithConnectionString(
            postgres.ConnectionString,
            new Dictionary<string, string?> { ["JWT_SIGNING_KEY"] = SigningKey });
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

    // AC 1: PATCH /api/v1/auth/password mit gültigem neuem Passwort (>= 8 Zeichen) setzt
    // must_change_password auf false und liefert 200 OK.
    [Fact]
    public async Task AC1_ValidNewPassword_SetsMustChangePasswordFalse_Returns200()
    {
        var (userId, token) = await CreateUserAndLoginAsync();
        using var client = AuthenticatedClient(token);

        var response = await client.PatchAsJsonAsync("/api/v1/auth/password", new { newPassword = "new-super-secret" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        var user = await dbContext.Users.SingleAsync(u => u.Id == userId);
        user.MustChangePassword.Should().BeFalse();
    }

    // AC 2: Jeder authentifizierte API-Request eines Nutzers mit must_change_password = true gegen
    // einen Endpoint außerhalb /api/v1/auth/* liefert 403 Forbidden mit
    // {"error":"PASSWORD_CHANGE_REQUIRED"}.
    [Fact]
    public async Task AC2_AuthenticatedRequestOutsideAuthEndpoints_WithMustChangePasswordTrue_Returns403()
    {
        var (_, token) = await CreateUserAndLoginAsync();
        using var client = AuthenticatedClient(token);

        var response = await client.GetAsync("/api/v1/health");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("error").GetString().Should().Be("PASSWORD_CHANGE_REQUIRED");
    }

    // AC 4: Integrationstest: Login mit must_change_password = true -> Zugriff auf einen
    // fachlichen Endpoint liefert 403; nach PATCH /api/v1/auth/password liefert derselbe Request
    // 200. (Endpoint-Substitution siehe Klassen-Doku.)
    [Fact]
    public async Task AC4_LoginWithMustChangePassword_BlocksEndpoint_ThenChangePassword_UnblocksSameRequest()
    {
        var (_, token) = await CreateUserAndLoginAsync();
        using var client = AuthenticatedClient(token);

        var before = await client.GetAsync("/api/v1/health");
        before.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var changeResponse = await client.PatchAsJsonAsync("/api/v1/auth/password", new { newPassword = "new-super-secret" });
        changeResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var after = await client.GetAsync("/api/v1/health");
        after.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private async Task<(Guid UserId, string Token)> CreateUserAndLoginAsync()
    {
        var email = $"us008-user-{Guid.NewGuid():N}@example.com";

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            var user = User.Create("Story-Test-Nutzer", email, InitialPassword);
            dbContext.Users.Add(user);
            await dbContext.SaveChangesAsync();
        }

        using var client = _factory.CreateClient();
        var loginResponse = await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password = InitialPassword });
        var loginBody = await loginResponse.Content.ReadFromJsonAsync<JsonElement>();
        var token = loginBody.GetProperty("token").GetString()!;
        loginBody.GetProperty("mustChangePassword").GetBoolean().Should().BeTrue();

        using var scope2 = _factory.Services.CreateScope();
        var dbContext2 = scope2.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        var userId = (await dbContext2.Users.SingleAsync(u => u.Email == new Email(email))).Id;

        return (userId, token);
    }

    private HttpClient AuthenticatedClient(string token)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}
