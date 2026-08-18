using FluentAssertions;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Shared.ValueObjects;

namespace SlobSteak.Domain.Tests.Shared;

/// <summary>
/// Unit-Tests für das Value Object <see cref="Email"/> (US-002).
/// </summary>
public class EmailTests
{
    [Theory]
    [InlineData("a@b.de")]
    [InlineData("test.user@example.com")]
    [InlineData("info+tag@sub.domain.io")]
    public void Constructor_WithValidFormat_CreatesEmail(string validValue)
    {
        var email = new Email(validValue);

        email.Value.Should().Be(validValue);
    }

    [Theory]
    [InlineData("")]
    [InlineData("no-at-sign.de")]
    [InlineData("missing-domain@")]
    [InlineData("@missing-local.de")]
    [InlineData("spaced address@example.com")]
    [InlineData("double@@example.com")]
    public void Constructor_WithInvalidFormat_ThrowsInvalidEmailFormatError(string invalidValue)
    {
        var act = () => new Email(invalidValue);

        act.Should().Throw<InvalidEmailFormatError>();
    }

    [Fact]
    public void Equality_ForSameValue_IsStructural()
    {
        (new Email("a@b.de") == new Email("a@b.de")).Should().BeTrue();
    }

    [Fact]
    public void Equality_ForDifferentValue_IsFalse()
    {
        (new Email("a@b.de") == new Email("c@d.de")).Should().BeFalse();
    }
}
