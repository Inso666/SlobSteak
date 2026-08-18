using FluentAssertions;

namespace SlobSteak.Application.Tests;

/// <summary>
/// Platzhalter-Testklasse für US-001 (Projekt-Grundgerüst). Belegt, dass das xUnit-Setup für
/// <c>SlobSteak.Application.Tests</c> funktionsfähig ist. Application-Use-Case-Tests folgen mit
/// den jeweiligen Stories, die konkrete Application Services einführen.
/// </summary>
public class ScaffoldingSanityTests
{
    [Fact]
    public void ApplicationTestProject_IsConfiguredAndRunnable()
    {
        var result = "SlobSteak";

        result.Should().NotBeNullOrWhiteSpace();
    }
}
