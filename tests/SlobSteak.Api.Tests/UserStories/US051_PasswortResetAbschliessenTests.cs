using System.Diagnostics;
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
/// Dedizierter Story-Test für US-051 ("Passwort zurücksetzen" in der Nutzerverwaltung schließt
/// zuverlässig ab). Prüft ausschließlich die in
/// <c>docs/usecases/US-051-passwort-reset-abschliessen.md</c> gelisteten Akzeptanzkriterien, ein
/// <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie im Story-Dokument.
///
/// <para>
/// AC 3 (UI zeigt zuverlässig Erfolgs-/Fehlermeldung statt dauerhaft hängendem
/// Verarbeitungs-Zustand) ist bewusst NICHT Teil dieser Klasse — das ist reine Frontend-Logik
/// (<c>UsersAdminComponent.onResetPassword</c>), abgedeckt durch den Angular-Story-Test
/// <c>us-051-passwort-reset-abschliessen.spec.ts</c> (CLAUDE.md/qa.md Abschnitt 1: „Betrifft eine
/// Story beide Seiten, existiert je ein Story-Test pro Seite“). AC 5 (Story-Test existiert gemäß
/// qa.md-Konvention) ist durch die Existenz dieser Klasse zusammen mit dem oben genannten
/// Frontend-Story-Test selbst erfüllt, kein eigener Testfall. AC 6 (bestehende Tests bleiben grün)
/// wird durch den grünen Gesamtlauf von <c>dotnet test</c>/<c>ng test</c> selbst nachgewiesen
/// (CLAUDE.md Abschnitt 2/3, qa.md Abschnitt 2), kein eigener Testfall.
/// </para>
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US051_PasswortResetAbschliessenTests : IAsyncLifetime
{
    private const string SigningKey = "test-jwt-signing-key-for-us051-story-tests-only!";
    private const string OriginalPassword = "correct-horse";

    private readonly SlobSteakApiFactory _factory;

    public US051_PasswortResetAbschliessenTests(PostgresContainerFixture postgres)
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

    // AC 1: Die tatsächliche Ursache ist ermittelt und dokumentiert — hier verifiziert: die
    // Story-Datei enthält die per Code-Review belegte Ursachenanalyse (Abschnitt „Anmerkungen des
    // Agenten“), nicht nur die ursprüngliche Verdachtsäußerung des Product Owners.
    [Fact]
    public void AC1_StoryDatei_DokumentiertUrsachenanalyse()
    {
        var storyFileText = ReadStoryFile();

        storyFileText.Should().Contain("Anmerkungen des Agenten",
            "die tatsächliche Ursachenanalyse muss in der Story-Datei nachvollziehbar dokumentiert sein (Akzeptanzkriterium 1)");
        storyFileText.Should().Contain("markForCheck",
            "die Dokumentation muss die konkrete technische Ursache (fehlendes markForCheck() im zoneless Frontend) benennen, nicht nur einen Verdacht");
    }

    // AC 2: POST /api/v1/admin/users/{id}/reset-password liefert bei einer gültigen Anfrage
    // zuverlässig eine erfolgreiche Response innerhalb einer für den Endpoint angemessenen Zeit
    // (kein Hängen/Timeout). Realer HTTP-Roundtrip über WebApplicationFactory gegen eine echte
    // Testcontainers-PostgreSQL-Instanz — belegt die Antwortzeit, statt sie nur zu behaupten.
    [Fact]
    public async Task AC2_ValidReset_RespondsSuccessfullyWithinReasonableTime()
    {
        var userId = await CreateTargetUserAsync();
        using var client = AdminClient();

        var stopwatch = Stopwatch.StartNew();
        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/users/{userId}/reset-password", new { temporaryPassword = "temporary-password-123" });
        stopwatch.Stop();

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        stopwatch.Elapsed.Should().BeLessThan(TimeSpan.FromSeconds(5),
            "der Endpoint darf laut Akzeptanzkriterium 2 nicht hängen/timeouten, sondern muss innerhalb einer für PBKDF2-Hashing plus EF-Core-Save angemessenen Zeit antworten");
    }

    // AC 4 (Backend-Anteil): ein automatisierter Backend-Test deckt den Erfolgsfall des
    // Reset-Endpoints ab — über die reine 200-OK-Prüfung aus AC 2 hinaus wird hier verifiziert,
    // dass die Response tatsächlich zu einem funktional korrekten, dauerhaft persistierten
    // Zustand führt (neues Passwort verifizierbar, Passwortwechsel beim nächsten Login erzwungen).
    [Fact]
    public async Task AC4_ValidReset_PersistsNewPasswordAndForcesPasswordChange()
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
        user.VerifyPassword(OriginalPassword).Should().BeFalse("das alte Passwort darf nach dem Reset nicht mehr gültig sein");
    }

    private async Task<Guid> CreateTargetUserAsync()
    {
        var email = $"us051-target-{Guid.NewGuid():N}@example.com";

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        var user = User.Create("Zielnutzer", email, OriginalPassword);
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        return user.Id;
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

    private static string ReadStoryFile() =>
        ReadRepositoryFile(Path.Combine("docs", "usecases", "US-051-passwort-reset-abschliessen.md"));

    private static string ReadRepositoryFile(string repositoryRelativePath)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "SlobSteak.sln")))
        {
            directory = directory.Parent;
        }

        directory.Should().NotBeNull("das Repository-Root (erkennbar an SlobSteak.sln) sollte von der Test-Ausgabe aus auffindbar sein");
        return File.ReadAllText(Path.Combine(directory!.FullName, repositoryRelativePath));
    }
}
