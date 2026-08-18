using FluentAssertions;
using Moq;
using SlobSteak.Application.Identity;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Application.Tests.Identity;

/// <summary>Tests für <see cref="ResetPasswordService"/> (US-013) gegen ein gemocktes
/// <see cref="IUserRepository"/> — ohne echte Datenbank.</summary>
public class ResetPasswordServiceTests
{
    [Fact]
    public async Task ResetPasswordAsync_ExistingUser_SetsMustChangePasswordTrue_ReturnsTrue()
    {
        var user = User.Create("Max Mustermann", "max@example.com", "correct-horse");
        user.ChangePassword("already-changed-once");
        var repository = new Mock<IUserRepository>();
        repository.Setup(r => r.FindByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var service = new ResetPasswordService(repository.Object);

        var result = await service.ResetPasswordAsync(user.Id, "temporary-password-123");

        result.Should().BeTrue();
        user.MustChangePassword.Should().BeTrue();
        user.VerifyPassword("temporary-password-123").Should().BeTrue();
        repository.Verify(r => r.SaveAsync(user, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ResetPasswordAsync_UnknownUserId_ReturnsFalse_DoesNotSave()
    {
        var repository = new Mock<IUserRepository>();
        repository.Setup(r => r.FindByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        var service = new ResetPasswordService(repository.Object);

        var result = await service.ResetPasswordAsync(Guid.NewGuid(), "temporary-password-123");

        result.Should().BeFalse();
        repository.Verify(r => r.SaveAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ResetPasswordAsync_PasswordTooShort_ThrowsPasswordTooShortError_DoesNotSave()
    {
        var user = User.Create("Max Mustermann", "max@example.com", "correct-horse");
        var repository = new Mock<IUserRepository>();
        repository.Setup(r => r.FindByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var service = new ResetPasswordService(repository.Object);

        var act = async () => await service.ResetPasswordAsync(user.Id, "short");

        await act.Should().ThrowAsync<PasswordTooShortError>();
        repository.Verify(r => r.SaveAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
