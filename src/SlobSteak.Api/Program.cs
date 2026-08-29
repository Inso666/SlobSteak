using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SlobSteak.Api.Auth;
using SlobSteak.Api.Authorization;
using SlobSteak.Api.Bootstrap;
using SlobSteak.Application;
using SlobSteak.Application.Identity;
using SlobSteak.Infrastructure;
using SlobSteak.Infrastructure.Persistence;

// US-049: Stoppuhr ab Prozessstart, um Kaltstart-Zeitanteile (Migration, Seed-Admin, Zeit bis zur
// Annahme von Requests) im Log sichtbar zu machen — Grundlage für die Ursachenanalyse der Story und
// Regressionsschutz für künftige Verlangsamungen. Rein diagnostisch, keine Verhaltensänderung.
var startupStopwatch = Stopwatch.StartNew();

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddHealthChecks();

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApplication();

// Implementierung des in SlobSteak.Application definierten Ports IJwtTokenGenerator (US-006) —
// bewusst hier in der Composition Root registriert, nicht in AddApplication()/AddInfrastructure():
// Application referenziert laut CLAUDE.md Abschnitt 3.1 ausschließlich Domain und darf daher keine
// konkrete JWT-Bibliothek einbinden; Infrastructure referenziert ebenfalls nur Domain, nicht
// Application, kann das Interface also nicht implementieren.
builder.Services.AddSingleton<IJwtTokenGenerator, JwtTokenGenerator>();

// Rollenbasierte Authorization-Middleware (US-007): JWT-Bearer-Authentication (liefert 401 bei
// fehlendem/ungültigem Token, bevor die Authorization-Handler unten greifen, Akzeptanzkriterium 4)
// plus zwei Policies (SystemAdmin, ProjectRole) mit zugehörigen Handlern.
builder.Services.AddHttpContextAccessor();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Verhindert, dass ASP.NET Core kurze JWT-Claim-Namen (z. B. "sub") automatisch auf lange
        // XML-Namespace-Uris (ClaimTypes.NameIdentifier) umschreibt — die Authorization-Handler
        // lesen dieselben Claim-Namen, die JwtTokenGenerator (US-006) ausstellt.
        options.MapInboundClaims = false;

        // Fällt auf einen Platzhalter zurück, falls JWT_SIGNING_KEY nicht gesetzt ist (z. B. in
        // Tests ohne Auth-Bezug, etwa dem DB-losen Health-Check-Test aus US-001) — Token-Ausgabe
        // (JwtTokenGenerator) und -Validierung verwenden in der Produktion denselben Wert, daher
        // ist ein fehlender Schlüssel dort gleichbedeutend mit "kein gültiges Token kann je
        // validiert werden", nicht mit einem stillen Sicherheitsloch.
        var signingKeyValue = builder.Configuration[JwtSettings.SigningKeyConfigurationKey]
            ?? "unconfigured-jwt-signing-key-placeholder-only-32-chars";

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = JwtSettings.Issuer,
            ValidateAudience = true,
            ValidAudience = JwtSettings.Audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKeyValue)),
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(AuthorizationPolicies.SystemAdmin, policy => policy.Requirements.Add(new SystemAdminRequirement()));
});
builder.Services.AddSingleton<IAuthorizationHandler, SystemAdminAuthorizationHandler>();
// Scoped statt Singleton: hängt von IProjectRepository (scoped, EF-DbContext-basiert) ab.
builder.Services.AddScoped<IAuthorizationHandler, ProjectRoleAuthorizationHandler>();
// Zweiter Handler für dieselbe ProjectRoleRequirement (US-022): löst das Projekt für Routen ohne
// projectId-Segment (z. B. PATCH /api/v1/stakeholders/{id}) über die Stakeholder-Id auf.
builder.Services.AddScoped<IAuthorizationHandler, StakeholderProjectRoleAuthorizationHandler>();
builder.Services.AddSingleton<IAuthorizationMiddlewareResultHandler, JsonAuthorizationMiddlewareResultHandler>();

// Seed-Admin-Bootstrap (US-005) läuft beim echten Hoststart (Development/Production), aber
// bewusst nicht im Hosting-Environment "Testing": WebApplicationFactory-basierte Tests bauen den
// Host teils ohne echte Datenbank auf (z. B. der DB-lose Health-Check-Test aus US-001) und/oder
// steuern die Seed-Vorbedingungen (leere/nicht-leere users-Tabelle, SEED_ADMIN_*-Konfiguration)
// gezielt selbst, um deterministisch zu bleiben — siehe
// tests/SlobSteak.Api.Tests/UserStories/US005_SeedAdminTests.cs, das den zugrunde liegenden
// SeedAdminService direkt aufruft statt sich auf den automatischen Hosted-Service-Start zu
// verlassen.
if (!builder.Environment.IsEnvironment("Testing"))
{
    builder.Services.AddHostedService<SeedAdminHostedService>();
}

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

    // Wendet ausstehende EF-Core-Migrationen beim Start automatisch an — ausschließlich für die
    // lokale/Dev-Umgebung (docker-compose, `dotnet run`), kein impliziter Produktionsmechanismus
    // (CLAUDE.md Abschnitt 3.4). In Produktion erfolgt das Ausrollen von Migrationen kontrolliert
    // außerhalb des Anwendungsstarts.
    //
    // US-049: Start-/Ende-Zeitstempel um die Migration herum — bei der realen Messung dieser Story
    // (siehe PR-Text/Story-Datei) war dies bei einer frischen Datenbank NICHT der dominante Anteil
    // der Kaltstart-Verzögerung (< 1s), wird aber sichtbar geloggt, damit ein künftiger Anstieg
    // (z. B. durch viele neue Migrationen) sofort im Log auffällt statt sich unbemerkt zu häufen.
    using var migrationScope = app.Services.CreateScope();
    var dbContext = migrationScope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
    app.Logger.LogInformation(
        "US-049: EF-Core-Migration wird gestartet ({ElapsedMs} ms seit Prozessstart).",
        startupStopwatch.ElapsedMilliseconds);
    var migrationStopwatch = Stopwatch.StartNew();
    dbContext.Database.Migrate();
    migrationStopwatch.Stop();
    app.Logger.LogInformation(
        "US-049: EF-Core-Migration abgeschlossen nach {DurationMs} ms ({ElapsedMs} ms seit Prozessstart).",
        migrationStopwatch.ElapsedMilliseconds,
        startupStopwatch.ElapsedMilliseconds);
}

app.UseHttpsRedirection();

app.UseAuthentication();

// Erzwungene Passwortänderung (US-008): muss nach der Authentifizierung (context.User ist gesetzt)
// aber vor der Policy-basierten Autorisierung (US-007) laufen — solange ein Nutzer sein Passwort
// ändern muss, blockiert dies pauschal jeden Endpoint außerhalb /api/v1/auth/*, unabhängig davon,
// welche ProjectRole-/SystemAdmin-Policy der jeweilige Endpoint sonst verlangen würde.
app.UseMiddleware<PasswordChangeRequiredMiddleware>();

app.UseAuthorization();

app.MapControllers();

// Simple JSON health check exposed under the versioned API prefix, per US-001 Akzeptanzkriterium.
app.MapHealthChecks("/api/v1/health", new HealthCheckOptions
{
    ResponseWriter = async (context, _) =>
    {
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new { status = "ok" }));
    }
});

// US-049: markiert im Log den Zeitpunkt, ab dem der Kestrel-Host tatsächlich Requests annimmt
// (nach IHostedService.StartAsync aller registrierten Hosted Services, u. a. SeedAdminHostedService,
// siehe ASP.NET-Core-Hosting-Reihenfolge) — Gegenstück zum Zeitstempel des ersten erfolgreichen
// Requests bei der realen Kaltstart-Messung dieser Story.
app.Lifetime.ApplicationStarted.Register(() =>
    app.Logger.LogInformation(
        "US-049: Anwendung bereit für Requests ({ElapsedMs} ms seit Prozessstart).",
        startupStopwatch.ElapsedMilliseconds));

app.Run();

// Partial class declaration so WebApplicationFactory<Program> can be used from integration tests.
public partial class Program { }
