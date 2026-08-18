using FluentAssertions;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Domain.Tests.Identity;

/// <summary>Unit-Tests für <see cref="User.ResetPassword"/> (US-013) — ohne Datenbank.</summary>
public class UserResetPasswordTests
{
    private const string OriginalPassword = "correct-horse";

    [Fact]
    public void ResetPassword_ValidTemporaryPassword_UpdatesHash_AndSetsMustChangePasswordTrue()
    {
        var user = User.Create("Max Mustermann", "max@example.com", OriginalPassword);
        user.ChangePassword("already-changed-once"); // simuliert einen Nutzer, der sein Passwort bereits selbst geändert hat
        user.MustChangePassword.Should().BeFalse();

        user.ResetPassword("temporary-password-123");

        user.MustChangePassword.Should().BeTrue();
        user.VerifyPassword("temporary-password-123").Should().BeTrue();
        user.VerifyPassword("already-changed-once").Should().BeFalse();
    }

    [Fact]
    public void ResetPassword_TooShort_ThrowsPasswordTooShortError()
    {
        var user = User.Create("Max Mustermann", "max@example.com", OriginalPassword);

        var act = () => user.ResetPassword("short");

        act.Should().Throw<PasswordTooShortError>();
    }
}
