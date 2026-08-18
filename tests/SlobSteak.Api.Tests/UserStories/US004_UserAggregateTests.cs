using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SlobSteak.Api.Tests.Persistence;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Shared.ValueObjects;

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-004 (User-Aggregate, Domain Model). Prüft ausschließlich die in
/// <c>docs/usecases/US-004-user-aggregate.md</c> gelisteten Akzeptanzkriterien, ein
/// <see cref="FactAttribute"/>/<see cref="TheoryAttribute"/> je Kriterium, in derselben Reihenfolge
/// wie im Story-Dokument. Läuft als Integrationstest über <see cref="SlobSteakApiFactory"/> gegen
/// eine echte Testcontainers-PostgreSQL-Instanz (AC 6 benötigt die tatsächliche
/// Infrastructure-Implementierung des Repositorys; AC 1–5 prüfen reines Domain-Verhalten, laufen
/// aber bewusst in derselben Klasse statt in <c>SlobSteak.Domain.Tests</c>, um den Story-Test gemäß
/// CLAUDE.md Kernregel 3 vollständig an einem Ort zu bündeln).
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US004_UserAggregateTests : IAsyncLifetime
{
    private const string ValidPassword = "correct-horse";

    private readonly SlobSteakApiFactory _factory;

    public US004_UserAggregateTests(PostgresContainerFixture postgres)
    {
        _factory = SlobSteakApiFactory.WithConnectionString(postgres.ConnectionString);
    }

    public async Task InitializeAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<Infrastructure.Persistence.SlobSteakDbContext>();
        await dbContext.Database.MigrateAsync();
    }

    public Task DisposeAsync()
    {
        _factory.Dispose();
        return Task.CompletedTask;
    }

    // AC 1: User.Create(name, email, plainPassword) erzeugt eine Instanz mit gehashtem Passwort
    // (password_hash); das Klartext-Passwort wird nirgends im Aggregate-Zustand gespeichert.
    [Fact]
    public void AC1_Create_ProducesInstanceWithHashedPassword_PlainPasswordNeverStored()
    {
        var user = User.Create("Max Mustermann", "max@example.com", ValidPassword);

        user.PasswordHash.Should().NotBeNullOrWhiteSpace();
        user.PasswordHash.Should().NotBe(ValidPassword);
        user.PasswordHash.Should().NotContain(ValidPassword);
    }

    // AC 2: User.Create wirft InvalidEmailFormatError, wenn email kein gültiges
    // Email-Value-Object bildet (Wiederverwendung von US-002).
    [Fact]
    public void AC2_Create_WithInvalidEmail_ThrowsInvalidEmailFormatError()
    {
        var act = () => User.Create("Max Mustermann", "kein-gueltiges-format", ValidPassword);

        act.Should().Throw<InvalidEmailFormatError>();
    }

    // AC 3: User.Create wirft PasswordTooShortError, wenn das Passwort weniger als 8 Zeichen hat.
    [Fact]
    public void AC3_Create_WithPasswordShorterThan8Characters_ThrowsPasswordTooShortError()
    {
        var act = () => User.Create("Max Mustermann", "max@example.com", "1234567");

        act.Should().Throw<PasswordTooShortError>();
    }

    // AC 4: User.ChangePassword(newPlainPassword) aktualisiert password_hash und setzt
    // must_change_password auf false.
    [Fact]
    public void AC4_ChangePassword_UpdatesPasswordHash_AndClearsMustChangePassword()
    {
        var user = User.Create("Max Mustermann", "max@example.com", ValidPassword);
        var hashBeforeChange = user.PasswordHash;

        user.ChangePassword("neues-passwort-123");

        user.PasswordHash.Should().NotBe(hashBeforeChange);
        user.MustChangePassword.Should().BeFalse();
    }

    // AC 5: User.VerifyPassword(plainPassword) gibt true/false zurück, ohne den gespeicherten
    // Hash offenzulegen.
    [Fact]
    public void AC5_VerifyPassword_ReturnsTrueOrFalse_WithoutExposingStoredHash()
    {
        var user = User.Create("Max Mustermann", "max@example.com", ValidPassword);

        user.VerifyPassword(ValidPassword).Should().BeTrue();
        user.VerifyPassword("falsches-passwort").Should().BeFalse();
    }

    // AC 6: Repository-Interface UserRepository (Domain) mit FindById, FindByEmail, Save,
    // ExistsByEmail ist definiert; eine Infrastruktur-Implementierung gegen die users-Tabelle
    // erfüllt das Interface (Integrationstest).
    [Fact]
    public async Task AC6_UserRepository_FindByIdFindByEmailSaveExistsByEmail_WorkAgainstRealDatabase()
    {
        using var scope = _factory.Services.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IUserRepository>();

        var email = new Email($"user-{Guid.NewGuid():N}@example.com");
        var user = User.Create("Integrationstest-Nutzer", email.Value, ValidPassword);

        (await repository.ExistsByEmailAsync(email)).Should().BeFalse();

        await repository.SaveAsync(user);

        (await repository.ExistsByEmailAsync(email)).Should().BeTrue();

        var byId = await repository.FindByIdAsync(user.Id);
        byId.Should().NotBeNull();
        byId!.Email.Should().Be(email);

        var byEmail = await repository.FindByEmailAsync(email);
        byEmail.Should().NotBeNull();
        byEmail!.Id.Should().Be(user.Id);

        var unknownEmail = new Email($"unbekannt-{Guid.NewGuid():N}@example.com");
        (await repository.FindByEmailAsync(unknownEmail)).Should().BeNull();
        (await repository.ExistsByEmailAsync(unknownEmail)).Should().BeFalse();
    }
}
