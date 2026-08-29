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
/// Dedizierter Story-Test für US-037 (CommunicationType-Aggregate & Admin-Katalog-API). Prüft
/// ausschließlich die in <c>docs/usecases/US-037-communication-type-katalog-api.md</c> gelisteten
/// Akzeptanzkriterien, ein <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie
/// im Story-Dokument, über eine echte Testcontainers-PostgreSQL-Instanz.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US037_CommunicationTypeKatalogApiTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us037-story-tests-only!";

    private readonly SlobSteakApiFactory _factory;

    public US037_CommunicationTypeKatalogApiTests(PostgresContainerFixture postgres)
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

    // AC 1: POST /api/v1/admin/communication-types mit name liefert 201 Created mit
    // is_active = true; Duplikat-Name liefert 409 Conflict mit {"error":"NAME_ALREADY_IN_USE"}.
    [Fact]
    public async Task AC1_Create_ReturnsCreated_WithIsActiveTrue_DuplicateName_Returns409()
    {
        using var client = AdminClient();
        var name = $"Newsletter-{Guid.NewGuid():N}";

        var created = await client.PostAsJsonAsync("/api/v1/admin/communication-types", new { name });

        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await created.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("isActive").GetBoolean().Should().BeTrue();
        body.GetProperty("name").GetString().Should().Be(name);

        var duplicate = await client.PostAsJsonAsync("/api/v1/admin/communication-types", new { name });

        duplicate.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var duplicateBody = await duplicate.Content.ReadFromJsonAsync<JsonElement>();
        duplicateBody.GetProperty("error").GetString().Should().Be("NAME_ALREADY_IN_USE");
    }

    // AC 2: PATCH /api/v1/admin/communication-types/{id} mit neuem name benennt den Eintrag um.
    [Fact]
    public async Task AC2_Update_WithNewName_RenamesEntry()
    {
        using var client = AdminClient();
        var id = await CreateCommunicationTypeAsync(client, $"Newsletter-{Guid.NewGuid():N}");
        var newName = $"Statusbericht-{Guid.NewGuid():N}";

        var response = await client.PatchAsJsonAsync($"/api/v1/admin/communication-types/{id}", new { name = newName });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("name").GetString().Should().Be(newName);
    }

    // AC 3: PATCH /api/v1/admin/communication-types/{id} mit is_active = false deaktiviert den
    // Eintrag, ohne ihn zu löschen; Datensatz bleibt in communication_types erhalten.
    [Fact]
    public async Task AC3_Update_WithIsActiveFalse_DeactivatesEntry_RecordRemainsInTable()
    {
        using var client = AdminClient();
        var name = $"Newsletter-{Guid.NewGuid():N}";
        var id = await CreateCommunicationTypeAsync(client, name);

        var response = await client.PatchAsJsonAsync($"/api/v1/admin/communication-types/{id}", new { isActive = false });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("isActive").GetBoolean().Should().BeFalse();

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        var persisted = await dbContext.CommunicationTypes.SingleOrDefaultAsync(c => c.Id == id);
        persisted.Should().NotBeNull();
        persisted!.Name.Should().Be(name);
        persisted.IsActive.Should().BeFalse();
    }

    // AC 4: GET /api/v1/communication-types?activeOnly=true liefert nur aktive Einträge; ohne den
    // Parameter werden alle Einträge inkl. deaktivierter geliefert.
    [Fact]
    public async Task AC4_List_ActiveOnly_ReturnsOnlyActiveEntries_WithoutParameter_ReturnsAllEntries()
    {
        using var adminClient = AdminClient();
        var activeName = $"Newsletter-{Guid.NewGuid():N}";
        var inactiveName = $"Statusbericht-{Guid.NewGuid():N}";
        await CreateCommunicationTypeAsync(adminClient, activeName);
        var inactiveId = await CreateCommunicationTypeAsync(adminClient, inactiveName);
        await adminClient.PatchAsJsonAsync($"/api/v1/admin/communication-types/{inactiveId}", new { isActive = false });

        using var userClient = NonAdminClient();

        var activeOnlyResponse = await userClient.GetAsync("/api/v1/communication-types?activeOnly=true");
        activeOnlyResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var activeOnlyBody = await activeOnlyResponse.Content.ReadFromJsonAsync<JsonElement>();
        var activeOnlyNames = activeOnlyBody.EnumerateArray().Select(e => e.GetProperty("name").GetString()).ToList();
        activeOnlyNames.Should().Contain(activeName);
        activeOnlyNames.Should().NotContain(inactiveName);

        var allResponse = await userClient.GetAsync("/api/v1/communication-types");
        allResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var allBody = await allResponse.Content.ReadFromJsonAsync<JsonElement>();
        var allNames = allBody.EnumerateArray().Select(e => e.GetProperty("name").GetString()).ToList();
        allNames.Should().Contain(activeName);
        allNames.Should().Contain(inactiveName);
    }

    // AC 5: Alle Schreib-Endpunkte sind ausschließlich für Systemadmins erreichbar.
    [Fact]
    public async Task AC5_WriteEndpoints_AsNonAdmin_Return403()
    {
        using var adminClient = AdminClient();
        var id = await CreateCommunicationTypeAsync(adminClient, $"Newsletter-{Guid.NewGuid():N}");

        using var nonAdminClient = NonAdminClient();

        var createResponse = await nonAdminClient.PostAsJsonAsync(
            "/api/v1/admin/communication-types", new { name = $"Newsletter-{Guid.NewGuid():N}" });
        createResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var updateResponse = await nonAdminClient.PatchAsJsonAsync(
            $"/api/v1/admin/communication-types/{id}", new { name = "Umbenannt" });
        updateResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    private static async Task<Guid> CreateCommunicationTypeAsync(HttpClient adminClient, string name)
    {
        var response = await adminClient.PostAsJsonAsync("/api/v1/admin/communication-types", new { name });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetGuid();
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
