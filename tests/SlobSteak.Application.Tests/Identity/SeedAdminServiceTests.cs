using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using SlobSteak.Application.Identity;
using SlobSteak.Domain.Identity;

namespace SlobSteak.Application.Tests.Identity;

/// <summary>
/// Tests für <see cref="SeedAdminService"/> (US-005) gegen ein gemocktes <see cref="IUserRepository"/>
/// — ohne echte Datenbank, per CLAUDE.md-Testpyramide auf Application-Ebene analog zu den
/// Domain-Unit-Tests.
/// </summary>
public class SeedAdminServiceTests
{
    private const string Email = "admin@example.com";
    private const string Password = "SuperSecret123";

    [Fact]
    public async Task SeedAsync_WhenNoUserExists_AndSeedConfigurationPresent_CreatesSystemAdmin()
    {
        var repository = new Mock<IUserRepository>();
        repository.Setup(r => r.AnyAsync(It.IsAny<CancellationToken>())).ReturnsAsync(false);

        User? savedUser = null;
        repository
            .Setup(r => r.SaveAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .Callback<User, CancellationToken>((user, _) => savedUser = user)
            .Returns(Task.CompletedTask);

        var configuration = ConfigurationWith(Email, Password);
        var service = new SeedAdminService(repository.Object, configuration, NullLogger<SeedAdminService>.Instance);

        await service.SeedAsync();

        savedUser.Should().NotBeNull();
        savedUser!.Email.Value.Should().Be(Email);
        savedUser.IsSystemAdmin.Should().BeTrue();
        savedUser.MustChangePassword.Should().BeTrue();
        savedUser.VerifyPassword(Password).Should().BeTrue();
    }

    [Fact]
    public async Task SeedAsync_WhenNoUserExists_AndSeedEmailMissing_ThrowsSeedAdminConfigurationMissingException_AndDoesNotSave()
    {
        var repository = new Mock<IUserRepository>();
        repository.Setup(r => r.AnyAsync(It.IsAny<CancellationToken>())).ReturnsAsync(false);

        var configuration = ConfigurationWith(email: null, password: Password);
        var service = new SeedAdminService(repository.Object, configuration, NullLogger<SeedAdminService>.Instance);

        var act = async () => await service.SeedAsync();

        await act.Should().ThrowAsync<SeedAdminConfigurationMissingException>();
        repository.Verify(r => r.SaveAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SeedAsync_WhenNoUserExists_AndSeedPasswordMissing_ThrowsSeedAdminConfigurationMissingException_AndDoesNotSave()
    {
        var repository = new Mock<IUserRepository>();
        repository.Setup(r => r.AnyAsync(It.IsAny<CancellationToken>())).ReturnsAsync(false);

        var configuration = ConfigurationWith(email: Email, password: null);
        var service = new SeedAdminService(repository.Object, configuration, NullLogger<SeedAdminService>.Instance);

        var act = async () => await service.SeedAsync();

        await act.Should().ThrowAsync<SeedAdminConfigurationMissingException>();
        repository.Verify(r => r.SaveAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SeedAsync_WhenAUserAlreadyExists_SkipsSeeding_WithoutErrorAndWithoutSave()
    {
        var repository = new Mock<IUserRepository>();
        repository.Setup(r => r.AnyAsync(It.IsAny<CancellationToken>())).ReturnsAsync(true);

        // Bewusst keine SEED_ADMIN_*-Konfiguration: Existiert bereits ein Nutzer, darf das Fehlen
        // der Konfiguration nicht zu einem Fehler führen (Seed-Vorgang wird komplett übersprungen).
        var configuration = ConfigurationWith(email: null, password: null);
        var service = new SeedAdminService(repository.Object, configuration, NullLogger<SeedAdminService>.Instance);

        var act = async () => await service.SeedAsync();

        await act.Should().NotThrowAsync();
        repository.Verify(r => r.SaveAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    private static IConfiguration ConfigurationWith(string? email, string? password)
    {
        var configuration = new Mock<IConfiguration>();
        configuration.Setup(c => c["SEED_ADMIN_EMAIL"]).Returns(email);
        configuration.Setup(c => c["SEED_ADMIN_PASSWORD"]).Returns(password);
        return configuration.Object;
    }
}
