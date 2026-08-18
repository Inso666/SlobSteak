using FluentAssertions;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Shared.ValueObjects;

namespace SlobSteak.Domain.Tests.Shared;

/// <summary>
/// Unit-Tests für das Value Object <see cref="Score"/> (US-002).
/// </summary>
public class ScoreTests
{
    [Theory]
    [InlineData(0)]
    [InlineData(100)]
    [InlineData(50)]
    public void Constructor_WithValueWithinRange_CreatesScore(int validValue)
    {
        var score = new Score(validValue);

        score.Value.Should().Be(validValue);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(101)]
    public void Constructor_WithValueOutsideRange_ThrowsInvalidScoreRangeError(int invalidValue)
    {
        var act = () => new Score(invalidValue);

        act.Should().Throw<InvalidScoreRangeError>();
    }

    [Fact]
    public void Equality_ForSameValue_IsStructural()
    {
        (new Score(42) == new Score(42)).Should().BeTrue();
    }

    [Fact]
    public void Equality_ForDifferentValue_IsFalse()
    {
        (new Score(42) == new Score(43)).Should().BeFalse();
    }
}
