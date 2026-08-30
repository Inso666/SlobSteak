using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-048 (PrimeNG-Lizenzschlüssel serverseitig verwalten statt im
/// Frontend-Bundle auszuliefern). Prüft ausschließlich die in
/// <c>docs/usecases/US-048-primeng-lizenzschluessel-serverseitig.md</c> gelisteten
/// Akzeptanzkriterien, ein <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie im
/// Story-Dokument.
///
/// <para>
/// AC 4 (Rotation ohne Frontend-Rebuild) ist laut Story-Dokument selbst nur "manuell verifiziert"
/// vorgesehen (Wert in <c>docker-compose.yml</c> ändern, Container neu starten, Frontend ohne
/// eigenen Rebuild neu laden) — kein reproduzierbarer, deterministischer xUnit-Fact möglich, da dies
/// echtes Container-Neustart-Verhalten prüft (qa.md Abschnitt 2 „viele Unit-Tests, weniger
/// Integrationstests"). Wird stattdessen im PR-Text als manuell durchgeführter Check dokumentiert.
/// AC 6 (Integrationstest für beide Umgebungsvariable-Fälle) ist keine eigene Testmethode, sondern
/// wird durch <see cref="AC2_GetPrimengLicense_UmgebungsvariableGesetzt_LiefertWert"/> und
/// <see cref="AC3_GetPrimengLicense_UmgebungsvariableNichtGesetzt_LiefertDefiniertenLeerwertOhneFehler"/>
/// gemeinsam nachgewiesen. AC 7 (Frontend-Bootstrap bezieht den Wert per HTTP statt hartcodiert) ist
/// reine Frontend-Logik und liegt im Angular-Story-Test
/// <c>frontend/src/app/us-048-primeng-license-serverseitig.spec.ts</c> (CLAUDE.md/qa.md
/// Abschnitt 1: „Betrifft eine Story beide Seiten, existiert je ein Story-Test pro Seite").
/// </para>
/// </summary>
public sealed class US048_PrimeNgLizenzschluesselServerseitigTests : IClassFixture<SlobSteakApiFactory>
{
    private readonly SlobSteakApiFactory _factory;

    public US048_PrimeNgLizenzschluesselServerseitigTests(SlobSteakApiFactory factory)
    {
        _factory = factory;
    }

    // AC 1: Der PrimeNG-Lizenzschlüssel ist in keiner versionierten Frontend-Datei (insbesondere
    // nicht in frontend/src/app/app.config.ts) mehr als Klartext-Literal hinterlegt.
    [Fact]
    public void AC1_AppConfigTs_EnthaeltKeinHartcodiertesLizenzschluesselLiteral()
    {
        var appConfigText = ReadRepositoryFile(Path.Combine("frontend", "src", "app", "app.config.ts"));

        appConfigText.Should().NotContain("eyJpZCI6", // Base64-Präfix des bisherigen JWT-artigen Lizenz-Literals (ADR-0009)
            "der bisher als Literal im license-Feld hinterlegte PrimeNG-Lizenzschlüssel darf nach US-048 nicht mehr im Quellcode stehen");
        appConfigText.Should().NotMatchRegex(@"license\s*:\s*['""][A-Za-z0-9._-]{20,}['""]",
            "es darf kein neuer/anderer hartcodierter Lizenzschlüssel als String-Literal am license-Feld hinterlegt werden");
    }

    // AC 2: Das Backend stellt einen unauthentifizierten Konfigurations-Endpoint
    // GET /api/v1/config/primeng-license bereit, der den aktuell konfigurierten Schlüssel aus
    // PRIMENG_LICENSE_KEY zurückliefert.
    [Fact]
    public async Task AC2_GetPrimengLicense_UmgebungsvariableGesetzt_LiefertWert()
    {
        using var factory = _factory.WithWebHostBuilder(builder =>
            builder.ConfigureAppConfiguration((_, configurationBuilder) =>
                configurationBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["PRIMENG_LICENSE_KEY"] = "test-lizenzschluessel-us048",
                })));
        using var client = factory.CreateClient();

        // Unauthentifizierter Aufruf ohne jeden Authorization-Header — muss trotzdem funktionieren,
        // da PrimeNG-Komponenten bereits vor dem Login (US-009) benötigt werden.
        var response = await client.GetAsync("/api/v1/config/primeng-license");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("primeNgLicenseKey").GetString().Should().Be("test-lizenzschluessel-us048");
    }

    // AC 3: Ist PRIMENG_LICENSE_KEY serverseitig nicht gesetzt, liefert der Endpoint einen
    // definierten Leerwert (kein Schlüsselfeld bzw. null) statt eines Fehlers.
    [Fact]
    public async Task AC3_GetPrimengLicense_UmgebungsvariableNichtGesetzt_LiefertDefiniertenLeerwertOhneFehler()
    {
        using var factory = _factory.WithWebHostBuilder(builder =>
            builder.ConfigureAppConfiguration((_, configurationBuilder) =>
                configurationBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    // Setzt den Wert explizit auf null statt ihn einfach wegzulassen: überschreibt
                    // damit deterministisch eine ggf. auf der ausführenden Maschine/CI-Runner real
                    // gesetzte PRIMENG_LICENSE_KEY-Umgebungsvariable, statt versehentlich von deren
                    // Fehlen abhängig zu sein.
                    ["PRIMENG_LICENSE_KEY"] = null,
                })));
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/v1/config/primeng-license");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("primeNgLicenseKey").ValueKind.Should().Be(JsonValueKind.Null);
    }

    // AC 5: docker-compose.yml definiert PRIMENG_LICENSE_KEY nach demselben Muster wie
    // JWT_SIGNING_KEY (Passthrough mit leerem Dev-Default, Kommentar mit Story-Verweis, kein
    // produktiver Schlüssel committet).
    [Fact]
    public void AC5_DockerComposeYml_DefiniertPrimengLicenseKeyImApiServiceMitLeeremDevDefault()
    {
        var composeText = ReadRepositoryFile("docker-compose.yml");
        var apiServiceBlock = ExtractServiceBlock(composeText, "api");

        apiServiceBlock.Should().Contain("PRIMENG_LICENSE_KEY: ${PRIMENG_LICENSE_KEY:-}",
            "die Umgebungsvariable muss per Passthrough mit leerem Dev-Default definiert sein, analog zu JWT_SIGNING_KEY");
        apiServiceBlock.Should().Contain("US-048",
            "der Kommentar über der Variable muss auf diese Story verweisen");

        composeText.Should().NotMatchRegex(@"PRIMENG_LICENSE_KEY:\s*[A-Za-z0-9._-]{20,}(?!\$)",
            "es darf kein produktiver/realer Lizenzschlüssel als Wert committet sein");
    }

    // AC 8: ADR-0009 erhält einen kurzen Nachtrag mit Verweis auf diese Story als Umsetzung des dort
    // dokumentierten technischen Follow-ups.
    [Fact]
    public void AC8_Adr0009_EnthaeltNachtragMitVerweisAufUs048()
    {
        var adrText = ReadRepositoryFile(Path.Combine("docs", "adr", "0009-primeui-lizenzpflicht-community-license-ausstehend.md"));

        adrText.Should().Contain("US-048",
            "die ADR muss einen Nachtrag mit Verweis auf US-048 als Umsetzung des Follow-ups enthalten");
    }

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

    /// <summary>Extrahiert den YAML-Block eines einzelnen Top-Level-Services aus
    /// <c>docker-compose.yml</c> — bewusst simples String-Parsing statt einer YAML-Bibliothek,
    /// identisches Muster wie in US049_KaltstartPerformanceErsterRequestTests.</summary>
    private static string ExtractServiceBlock(string composeText, string serviceName)
    {
        var lines = composeText.Replace("\r\n", "\n").Split('\n');
        var startIndex = Array.FindIndex(lines, l => System.Text.RegularExpressions.Regex.IsMatch(l, $@"^  {System.Text.RegularExpressions.Regex.Escape(serviceName)}:\s*$"));
        startIndex.Should().BeGreaterThanOrEqualTo(0, $"docker-compose.yml sollte einen Top-Level-Service '{serviceName}' definieren");

        var endIndex = lines.Length;
        for (var i = startIndex + 1; i < lines.Length; i++)
        {
            if (System.Text.RegularExpressions.Regex.IsMatch(lines[i], @"^\S") || System.Text.RegularExpressions.Regex.IsMatch(lines[i], @"^  \S"))
            {
                endIndex = i;
                break;
            }
        }

        return string.Join('\n', lines[startIndex..endIndex]);
    }
}
