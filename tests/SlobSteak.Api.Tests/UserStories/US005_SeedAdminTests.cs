using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SlobSteak.Application.Identity;
using SlobSteak.Domain.Identity;
using SlobSteak.Infrastructure.Persistence;
using Testcontainers.PostgreSql;

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-005 (Seed-Admin-Bootstrap beim Erststart). Prüft ausschließlich
/// die in <c>docs/usecases/US-005-seed-admin.md</c> gelisteten Akzeptanzkriterien, ein
/// <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie im Story-Dokument.
///
/// <para>
/// Jeder Test bekommt eine eigene, frisch gestartete Testcontainers-PostgreSQL-Instanz (statt der
/// zwischen mehreren Testklassen geteilten <c>PostgresCollection</c>): Die Akzeptanzkriterien
/// hängen unmittelbar vom exakten Zustand der <c>users</c>-Tabelle (leer vs. nicht leer) ab, den
/// eine geteilte Instanz zwischen unabhängig voneinander laufenden Testklassen nicht deterministisch
/// garantieren könnte. Der zugrunde liegende <see cref="SeedAdminService"/> wird direkt über die
/// DI-Container-Registrierung der Factory aufgerufen statt über den automatischen Start des
/// <c>IHostedService</c> (der in der Hosting-Umgebung <c>"Testing"</c> bewusst nicht registriert
/// wird, siehe Kommentar in <c>Program.cs</c>) — das verifizierte Verhalten (Prüfung auf
/// vorhandene Nutzer, Anlage bzw. Fehlerabbruch) ist identisch mit dem, was der Hosted Service beim
/// echten Anwendungsstart auslöst.
/// </para>
/// </summary>
public sealed class US005_SeedAdminTests : IAsyncLifetime
{
    private const string SeedEmail = "seed-admin@example.com";
    private const string SeedPassword = "ChangeMe123!";

    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:16-alpine")
        .WithDatabase("slobsteak_test")
        .WithUsername("slobsteak")
        .WithPassword("slobsteak")
        .Build();

    public Task InitializeAsync() => _container.StartAsync();

    public Task DisposeAsync() => _container.DisposeAsync().AsTask();

    // AC 1: Beim Anwendungsstart prüft ein SeedAdminService, ob mindestens ein User-Datensatz
    // existiert; existiert keiner, wird ein Admin-Konto aus SEED_ADMIN_EMAIL und
    // SEED_ADMIN_PASSWORD angelegt.
    [Fact]
    public async Task AC1_EmptyUsersTable_WithSeedConfiguration_CreatesAdminAccountFromEnvironmentValues()
    {
        using var factory = CreateFactory(seedEmail: SeedEmail, seedPassword: SeedPassword);
        await MigrateAsync(factory);

        using var scope = factory.Services.CreateScope();
        var seedAdminService = scope.ServiceProvider.GetRequiredService<SeedAdminService>();
        await seedAdminService.SeedAsync();

        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        var users = await dbContext.Users.ToListAsync();

        users.Should().ContainSingle(u => u.Email.Value == SeedEmail);
    }

    // AC 2: Das erzeugte Admin-Konto hat is_system_admin = true und must_change_password = true.
    [Fact]
    public async Task AC2_CreatedAdminAccount_HasIsSystemAdminTrue_AndMustChangePasswordTrue()
    {
        using var factory = CreateFactory(seedEmail: SeedEmail, seedPassword: SeedPassword);
        await MigrateAsync(factory);

        using var scope = factory.Services.CreateScope();
        var seedAdminService = scope.ServiceProvider.GetRequiredService<SeedAdminService>();
        await seedAdminService.SeedAsync();

        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        var users = await dbContext.Users.ToListAsync();
        var admin = users.Single(u => u.Email.Value == SeedEmail);

        admin.IsSystemAdmin.Should().BeTrue();
        admin.MustChangePassword.Should().BeTrue();
    }

    // AC 3: Fehlen SEED_ADMIN_EMAIL oder SEED_ADMIN_PASSWORD beim Erststart ohne existierende
    // Nutzer, bricht der Start mit einer klaren Fehlermeldung im Log ab (kein stiller Fehlschlag).
    [Fact]
    public async Task AC3_EmptyUsersTable_WithoutSeedConfiguration_ThrowsClearConfigurationError()
    {
        using var factory = CreateFactory(seedEmail: null, seedPassword: null);
        await MigrateAsync(factory);

        using var scope = factory.Services.CreateScope();
        var seedAdminService = scope.ServiceProvider.GetRequiredService<SeedAdminService>();

        var act = async () => await seedAdminService.SeedAsync();

        (await act.Should().ThrowAsync<SeedAdminConfigurationMissingException>())
            .WithMessage("*SEED_ADMIN_EMAIL*SEED_ADMIN_PASSWORD*");

        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        (await dbContext.Users.CountAsync()).Should().Be(0);
    }

    // AC 4: Existiert bereits mindestens ein Nutzer, wird der Seed-Vorgang übersprungen (kein
    // Duplikat, kein Fehler) — Integrationstest deckt Start bei bereits vorhandenen Nutzern ab.
    [Fact]
    public async Task AC4_UsersTableAlreadyHasAUser_SkipsSeeding_NoDuplicateNoError()
    {
        using var factory = CreateFactory(seedEmail: SeedEmail, seedPassword: SeedPassword);
        await MigrateAsync(factory);

        using (var seedScope = factory.Services.CreateScope())
        {
            var preexisting = User.Create("Bestehender Nutzer", "existing-user@example.com", "irrelevant123");
            var dbContext = seedScope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
            dbContext.Users.Add(preexisting);
            await dbContext.SaveChangesAsync();
        }

        using var scope = factory.Services.CreateScope();
        var seedAdminService = scope.ServiceProvider.GetRequiredService<SeedAdminService>();

        var act = async () => await seedAdminService.SeedAsync();
        await act.Should().NotThrowAsync();

        var dbContextAfter = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        var users = await dbContextAfter.Users.ToListAsync();

        users.Should().ContainSingle();
        users.Single().Email.Value.Should().Be("existing-user@example.com");
    }

    private SlobSteakApiFactory CreateFactory(string? seedEmail, string? seedPassword) =>
        SlobSteakApiFactory.WithConnectionString(
            _container.GetConnectionString(),
            new Dictionary<string, string?>
            {
                ["SEED_ADMIN_EMAIL"] = seedEmail,
                ["SEED_ADMIN_PASSWORD"] = seedPassword,
            });

    private static async Task MigrateAsync(SlobSteakApiFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        await dbContext.Database.MigrateAsync();
    }
}
