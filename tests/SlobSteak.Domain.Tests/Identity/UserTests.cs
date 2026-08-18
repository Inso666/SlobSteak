using FluentAssertions;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Domain.Tests.Identity;

/// <summary>
/// Unit-Tests für das <see cref="User"/>-Aggregate (US-004): decken jede in
/// <c>docs/usecases/US-004-user-aggregate.md</c> genannte Verhaltensregel/Invariante ab, ohne
/// Datenbank, Netzwerk oder Dateisystem (CLAUDE.md Kernregel 2).
/// </summary>
public class UserTests
{
    private const string ValidEmail = "user@example.com";
    private const string ValidPassword = "correct-horse";

    [Fact]
    public void Create_WithValidData_ProducesUserWithHashedPassword_NotEqualToPlainPassword()
    {
        var user = User.Create("Max Mustermann", ValidEmail, ValidPassword);

        user.PasswordHash.Should().NotBeNullOrWhiteSpace();
        user.PasswordHash.Should().NotBe(ValidPassword);
    }

    [Fact]
    public void Create_WithValidData_SetsExpectedDefaults()
    {
        var user = User.Create("Max Mustermann", ValidEmail, ValidPassword);

        user.Name.Should().Be("Max Mustermann");
        user.Email.Value.Should().Be(ValidEmail);
        user.IsSystemAdmin.Should().BeFalse();
        user.MustChangePassword.Should().BeTrue();
    }

    [Theory]
    [InlineData("no-at-sign.de")]
    [InlineData("missing-domain@")]
    [InlineData("")]
    public void Create_WithInvalidEmail_ThrowsInvalidEmailFormatError(string invalidEmail)
    {
        var act = () => User.Create("Max Mustermann", invalidEmail, ValidPassword);

        act.Should().Throw<InvalidEmailFormatError>();
    }

    [Theory]
    [InlineData("")]
    [InlineData("1234567")]
    public void Create_WithPasswordShorterThan8Characters_ThrowsPasswordTooShortError(string tooShortPassword)
    {
        var act = () => User.Create("Max Mustermann", ValidEmail, tooShortPassword);

        act.Should().Throw<PasswordTooShortError>();
    }

    [Fact]
    public void ChangePassword_WithValidNewPassword_UpdatesHashAndClearsMustChangePassword()
    {
        var user = User.Create("Max Mustermann", ValidEmail, ValidPassword);
        var previousHash = user.PasswordHash;

        user.ChangePassword("new-super-secret");

        user.PasswordHash.Should().NotBe(previousHash);
        user.MustChangePassword.Should().BeFalse();
    }

    [Fact]
    public void ChangePassword_WithPasswordShorterThan8Characters_ThrowsPasswordTooShortError()
    {
        var user = User.Create("Max Mustermann", ValidEmail, ValidPassword);

        var act = () => user.ChangePassword("short");

        act.Should().Throw<PasswordTooShortError>();
    }

    [Fact]
    public void VerifyPassword_WithCorrectPlainPassword_ReturnsTrue()
    {
        var user = User.Create("Max Mustermann", ValidEmail, ValidPassword);

        user.VerifyPassword(ValidPassword).Should().BeTrue();
    }

    [Fact]
    public void VerifyPassword_WithIncorrectPlainPassword_ReturnsFalse()
    {
        var user = User.Create("Max Mustermann", ValidEmail, ValidPassword);

        user.VerifyPassword("something-else").Should().BeFalse();
    }

    [Fact]
    public void VerifyPassword_AfterChangePassword_OnlyAcceptsTheNewPassword()
    {
        var user = User.Create("Max Mustermann", ValidEmail, ValidPassword);

        user.ChangePassword("new-super-secret");

        user.VerifyPassword(ValidPassword).Should().BeFalse();
        user.VerifyPassword("new-super-secret").Should().BeTrue();
    }
}
