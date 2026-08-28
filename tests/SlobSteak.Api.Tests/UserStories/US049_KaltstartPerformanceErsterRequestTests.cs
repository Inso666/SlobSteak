using System.Text.RegularExpressions;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;
using SlobSteak.Api.Tests.Persistence;

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-049 (Verlässliche Antwortzeit &amp; Statusrückmeldung beim ersten
/// Request nach Systemstart). Prüft ausschließlich die in
/// <c>docs/usecases/US-049-kaltstart-performance-erster-request.md</c> gelisteten
/// Akzeptanzkriterien, ein <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie im
/// Story-Dokument.
///
/// <para>
/// AC 5 (technischer Anknüpfungspunkt für eine &gt;3s-Rückmeldung) ist bewusst NICHT Teil dieser
/// Klasse — das ist reine Frontend-Logik (<c>LoginPageComponent</c>/<c>ProcessingButtonComponent</c>),
/// die ein Frontend-Agent auf demselben Branch umsetzt und mit einem eigenen Angular-Story-Test
/// abdeckt (CLAUDE.md/qa.md Abschnitt 1: „Betrifft eine Story beide Seiten, existiert je ein
/// Story-Test pro Seite“). AC 6 (bestehende Tests bleiben grün) ist kein eigener Testfall, sondern
/// wird durch den grünen Gesamtlauf von <c>dotnet test</c> selbst nachgewiesen (CLAUDE.md
/// Abschnitt 2/3, qa.md Abschnitt 2).
/// </para>
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US049_KaltstartPerformanceErsterRequestTests
{
    private readonly PostgresContainerFixture _postgres;

    public US049_KaltstartPerformanceErsterRequestTests(PostgresContainerFixture postgres)
    {
        _postgres = postgres;
    }

    // AC 1: Es liegt eine dokumentierte, im PR nachvollziehbare Ursachenanalyse vor, welcher Faktor
    // tatsächlich ursächlich war — mit einer echten Zeitmessung (nicht nur Code-Review), siehe
    // Story-Datei „Anmerkungen des Agenten“.
    [Fact]
    public void AC1_StoryDatei_DokumentiertUrsachenanalyseMitRealerZeitmessung()
    {
        var storyFileText = ReadStoryFile();

        storyFileText.Should().Contain("Anmerkungen des Agenten",
            "die reale Ursachenanalyse muss in der Story-Datei nachvollziehbar dokumentiert sein");
        storyFileText.Should().Contain("docker compose",
            "die Dokumentation muss den real ausgeführten docker-compose-Messaufbau belegen, nicht nur eine Code-Review-Vermutung");
        Regex.Matches(storyFileText, @"\d+\s*ms").Count.Should().BeGreaterThanOrEqualTo(3,
            "die Zeitmessung muss konkrete Millisekunden-Werte enthalten (Migration, Seed-Admin, Kaltstart-Fenster), keine bloße Schätzung");
    }

    // AC 2: `api` besitzt einen healthcheck in docker-compose.yml (gegen /api/v1/health), `frontend`
    // erhält `condition: service_healthy` für seine Abhängigkeit von `api`.
    [Fact]
    public void AC2_DockerComposeYml_ApiHatHealthcheckUndFrontendWartetAufServiceHealthy()
    {
        var composeText = ReadRepositoryFile("docker-compose.yml");

        var apiServiceBlock = ExtractServiceBlock(composeText, "api");
        apiServiceBlock.Should().Contain("healthcheck:",
            "der api-Service muss einen Healthcheck definieren (Akzeptanzkriterium 2)");
        apiServiceBlock.Should().Contain("/api/v1/health",
            "der Healthcheck muss gegen den bestehenden Health-Endpoint prüfen");

        var frontendServiceBlock = ExtractServiceBlock(composeText, "frontend");
        frontendServiceBlock.Should().Contain("condition: service_healthy",
            "frontend darf laut Akzeptanzkriterium 2 erst starten, wenn api tatsächlich Requests beantworten kann, nicht nur gestartet wurde");

        // depends_on muss sich konkret auf den Service "api" beziehen (nicht z. B. nur auf db).
        Regex.IsMatch(
                frontendServiceBlock,
                @"depends_on:\s*\r?\n\s*api:\s*\r?\n\s*condition:\s*service_healthy")
            .Should().BeTrue("die service_healthy-Bedingung muss unter dem api-Eintrag von frontends depends_on stehen");
    }

    // AC 3: Migrations- und Seed-Admin-Startzeit sind gemessen und im Log sichtbar (Start-/Ende-
    // Zeitstempel), damit künftige Regressionen sofort auffallen. Integrationstest gegen eine echte
    // Testcontainers-PostgreSQL-Instanz, mit Hosting-Environment "Development" (statt des sonst für
    // DB-lose Tests verwendeten "Testing"), um exakt den realen Startpfad aus Program.cs zu
    // durchlaufen (Migrate() + SeedAdminHostedService laufen dort nur unter IsDevelopment() bzw.
    // außerhalb von "Testing").
    [Fact]
    public async Task AC3_ApplikationsstartGegenLeereDatenbank_LoggtMigrationsUndSeedAdminZeitstempel()
    {
        var capturingLoggerProvider = new CapturingLoggerProvider();

        using var baseFactory = SlobSteakApiFactory.WithConnectionString(
            _postgres.ConnectionString,
            additionalConfiguration: new Dictionary<string, string?>
            {
                ["SEED_ADMIN_EMAIL"] = "us049-agent@example.com",
                ["SEED_ADMIN_PASSWORD"] = "ChangeMe123!",
            },
            environmentName: "Development");

        using var factory = baseFactory.WithWebHostBuilder(builder =>
            builder.ConfigureLogging(loggingBuilder => loggingBuilder.AddProvider(capturingLoggerProvider)));

        // Erzwingt den lazy Host-Aufbau (inkl. des Top-Level-Startup-Codes aus Program.cs, der die
        // Migration und den SeedAdminHostedService auslöst) noch innerhalb dieses Tests.
        using var client = factory.CreateClient();
        var healthResponse = await client.GetAsync("/api/v1/health");
        healthResponse.EnsureSuccessStatusCode();

        var messages = capturingLoggerProvider.Messages;

        messages.Should().ContainSingle(m => m.Contains("US-049: EF-Core-Migration wird gestartet"));
        messages.Should().Contain(m =>
            Regex.IsMatch(m, @"US-049: EF-Core-Migration abgeschlossen nach \d+ ms"));

        messages.Should().ContainSingle(m => m.Contains("US-049: Seed-Admin-Bootstrap gestartet"));
        messages.Should().Contain(m =>
            Regex.IsMatch(m, @"US-049: Seed-Admin-Bootstrap abgeschlossen nach \d+ ms"));
    }

    // AC 4: Der allererste erfolgreiche Login nach einem frischen docker-compose up (leeres
    // db-data-Volume) dauert nachweislich spürbar kürzer als im aktuellen Zustand — konkreter
    // Zielwert vom Backend-Agenten begründet in der Story-Datei dokumentiert (kein reproduzierbarer
    // xUnit-Fact möglich, da echte Container-Kaltstartzeiten nicht deterministisch/schnell genug für
    // die CI-Testpyramide sind, siehe qa.md Abschnitt 2 „viele Unit-Tests, weniger
    // Integrationstests“) — hier verifiziert: Vorher-/Nachher-Messung und begründeter Zielwert sind
    // in der Story-Datei nachvollziehbar dokumentiert.
    [Fact]
    public void AC4_StoryDatei_DokumentiertVorherNachherMessungUndBegruendetenZielwert()
    {
        var storyFileText = ReadStoryFile();

        storyFileText.Should().Contain("Zielwert",
            "ein konkreter, begründeter Zielwert für 'spürbar kürzer' muss dokumentiert sein (Akzeptanzkriterium 4)");
        storyFileText.Should().Contain("Vorher", "die Vorher-Messung muss dokumentiert sein");
        storyFileText.Should().Contain("Nachher", "die Nachher-Messung muss dokumentiert sein");
    }

    private string ReadStoryFile() =>
        ReadRepositoryFile(Path.Combine("docs", "usecases", "US-049-kaltstart-performance-erster-request.md"));

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
    /// <c>docker-compose.yml</c> (von der Zeile <c>"  {serviceName}:"</c> bis zur nächsten Zeile mit
    /// derselben Einrückungstiefe) — bewusst simples String-Parsing statt einer YAML-Bibliothek, um
    /// keine neue Abhängigkeit für einen einzelnen Story-Test einzuführen.</summary>
    private static string ExtractServiceBlock(string composeText, string serviceName)
    {
        var lines = composeText.Replace("\r\n", "\n").Split('\n');
        var startIndex = Array.FindIndex(lines, l => Regex.IsMatch(l, $@"^  {Regex.Escape(serviceName)}:\s*$"));
        startIndex.Should().BeGreaterThanOrEqualTo(0, $"docker-compose.yml sollte einen Top-Level-Service '{serviceName}' definieren");

        var endIndex = lines.Length;
        for (var i = startIndex + 1; i < lines.Length; i++)
        {
            if (Regex.IsMatch(lines[i], @"^\S") || Regex.IsMatch(lines[i], @"^  \S"))
            {
                endIndex = i;
                break;
            }
        }

        return string.Join('\n', lines[startIndex..endIndex]);
    }

    /// <summary>Minimaler in-memory <see cref="ILoggerProvider"/>, der alle formatierten Log-Zeilen
    /// thread-sicher sammelt — genügt für diesen Story-Test, ohne eine zusätzliche
    /// Test-Logging-Bibliothek einzuführen.</summary>
    private sealed class CapturingLoggerProvider : ILoggerProvider
    {
        private readonly List<string> _messages = new();

        public IReadOnlyList<string> Messages => _messages;

        public ILogger CreateLogger(string categoryName) => new CapturingLogger(this);

        public void Dispose()
        {
        }

        private void Capture(string message)
        {
            lock (_messages)
            {
                _messages.Add(message);
            }
        }

        private sealed class CapturingLogger : ILogger
        {
            private readonly CapturingLoggerProvider _owner;

            public CapturingLogger(CapturingLoggerProvider owner)
            {
                _owner = owner;
            }

            public IDisposable BeginScope<TState>(TState state) where TState : notnull => NullScope.Instance;

            public bool IsEnabled(LogLevel logLevel) => true;

            public void Log<TState>(
                LogLevel logLevel,
                EventId eventId,
                TState state,
                Exception? exception,
                Func<TState, Exception?, string> formatter) =>
                _owner.Capture(formatter(state, exception));
        }

        private sealed class NullScope : IDisposable
        {
            public static readonly NullScope Instance = new();

            public void Dispose()
            {
            }
        }
    }
}
