using FluentAssertions;
using Moq;
using SlobSteak.Application.Identity;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Shared.ValueObjects;

namespace SlobSteak.Application.Tests.Identity;

/// <summary>Tests für <see cref="CreateUserService"/> (US-012) gegen ein gemocktes
/// <see cref="IUserRepository"/> — ohne echte Datenbank.</summary>
public class CreateUserServiceTests
{
    [Fact]
    public async Task CreateUserAsync_NewEmail_CreatesUser_WithMustChangePasswordTrue()
    {
        var repository = new Mock<IUserRepository>();
        repository.Setup(r => r.ExistsByEmailAsync(It.IsAny<Email>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);

        var service = new CreateUserService(repository.Object);

        var user = await service.CreateUserAsync("Max Mustermann", "max@example.com", "initial-pass");

        user.Name.Should().Be("Max Mustermann");
        user.Email.Value.Should().Be("max@example.com");
        user.MustChangePassword.Should().BeTrue();
        repository.Verify(r => r.SaveAsync(user, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateUserAsync_EmailAlreadyExists_ThrowsEmailAlreadyInUseError_DoesNotSave()
    {
        var repository = new Mock<IUserRepository>();
        repository.Setup(r => r.ExistsByEmailAsync(It.IsAny<Email>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var service = new CreateUserService(repository.Object);

        var act = async () => await service.CreateUserAsync("Max Mustermann", "max@example.com", "initial-pass");

        await act.Should().ThrowAsync<EmailAlreadyInUseError>();
        repository.Verify(r => r.SaveAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateUserAsync_PasswordTooShort_ThrowsPasswordTooShortError_DoesNotSave()
    {
        var repository = new Mock<IUserRepository>();
        repository.Setup(r => r.ExistsByEmailAsync(It.IsAny<Email>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);

        var service = new CreateUserService(repository.Object);

        var act = async () => await service.CreateUserAsync("Max Mustermann", "max@example.com", "short");

        await act.Should().ThrowAsync<PasswordTooShortError>();
        repository.Verify(r => r.SaveAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
