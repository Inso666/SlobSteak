using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using SlobSteak.Api.Auth;
using SlobSteak.Api.Bootstrap;
using SlobSteak.Application;
using SlobSteak.Application.Identity;
using SlobSteak.Infrastructure;
using SlobSteak.Infrastructure.Persistence;

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
    using var migrationScope = app.Services.CreateScope();
    var dbContext = migrationScope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
    dbContext.Database.Migrate();
}

app.UseHttpsRedirection();

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

app.Run();

// Partial class declaration so WebApplicationFactory<Program> can be used from integration tests.
public partial class Program { }
