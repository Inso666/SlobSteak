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
/// Dedizierter Story-Test für US-014 (Admin-API: Projekt anlegen). Prüft ausschließlich die in
/// <c>docs/usecases/US-014-admin-projekt-anlegen.md</c> gelisteten Akzeptanzkriterien, ein
/// <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie im Story-Dokument, über
/// eine echte Testcontainers-PostgreSQL-Instanz.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US014_AdminProjektAnlegenTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us014-story-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public US014_AdminProjektAnlegenTests(PostgresContainerFixture postgres)
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

    // AC 1: POST /api/v1/admin/projects mit name, description liefert 201 Created mit
    // status = active.
    [Fact]
    public async Task AC1_ValidRequest_Returns201_WithActiveStatus()
    {
        using var client = AdminClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/admin/projects", new { name = $"Projekt-{Guid.NewGuid():N}", description = "Beschreibung" });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("status").GetString().Should().Be("Active");
    }

    // AC 2: POST /api/v1/admin/projects mit leerem name liefert 400 Bad Request.
    [Fact]
    public async Task AC2_BlankName_Returns400()
    {
        using var client = AdminClient();

        var response = await client.PostAsJsonAsync("/api/v1/admin/projects", new { name = "   ", description = "Beschreibung" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // AC 3: Endpoint ist ausschließlich für Systemadmins erreichbar (403 sonst).
    [Fact]
    public async Task AC3_AsNonAdmin_Returns403()
    {
        using var client = NonAdminClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/admin/projects", new { name = $"Projekt-{Guid.NewGuid():N}", description = "Beschreibung" });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // AC 4: Integrationstest deckt erfolgreiche Anlage und Validierungsfehler ab — bereits durch
    // AC1/AC2 abgedeckt.
    [Fact]
    public async Task AC4_EmptyNameEntirely_AlsoReturns400()
    {
        using var client = AdminClient();

        var response = await client.PostAsJsonAsync("/api/v1/admin/projects", new { name = "", description = (string?)null });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
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
