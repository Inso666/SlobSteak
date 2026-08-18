using FluentAssertions;
using Moq;
using SlobSteak.Application.Identity;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Application.Tests.Identity;

/// <summary>Tests für <see cref="ChangePasswordService"/> (US-008) gegen ein gemocktes
/// <see cref="IUserRepository"/> — ohne echte Datenbank.</summary>
public class ChangePasswordServiceTests
{
    [Fact]
    public async Task ChangePasswordAsync_ExistingUser_ChangesPassword_ClearsMustChangePassword_ReturnsTrue()
    {
        var user = User.Create("Max Mustermann", "max@example.com", "correct-horse");
        var repository = new Mock<IUserRepository>();
        repository.Setup(r => r.FindByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var service = new ChangePasswordService(repository.Object);

        var result = await service.ChangePasswordAsync(user.Id, "new-super-secret");

        result.Should().BeTrue();
        user.MustChangePassword.Should().BeFalse();
        user.VerifyPassword("new-super-secret").Should().BeTrue();
        repository.Verify(r => r.SaveAsync(user, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ChangePasswordAsync_UnknownUserId_ReturnsFalse_DoesNotSave()
    {
        var repository = new Mock<IUserRepository>();
        repository.Setup(r => r.FindByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        var service = new ChangePasswordService(repository.Object);

        var result = await service.ChangePasswordAsync(Guid.NewGuid(), "new-super-secret");

        result.Should().BeFalse();
        repository.Verify(r => r.SaveAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ChangePasswordAsync_PasswordTooShort_ThrowsPasswordTooShortError_DoesNotSave()
    {
        var user = User.Create("Max Mustermann", "max@example.com", "correct-horse");
        var repository = new Mock<IUserRepository>();
        repository.Setup(r => r.FindByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var service = new ChangePasswordService(repository.Object);

        var act = async () => await service.ChangePasswordAsync(user.Id, "short");

        await act.Should().ThrowAsync<PasswordTooShortError>();
        repository.Verify(r => r.SaveAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
