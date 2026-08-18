using FluentAssertions;

namespace SlobSteak.Domain.Tests;

/// <summary>
/// Platzhalter-Testklasse für US-001 (Projekt-Grundgerüst). Belegt, dass das xUnit-Setup für
/// <c>SlobSteak.Domain.Tests</c> funktionsfähig ist und über <c>dotnet test</c> ausgeführt wird.
/// Echte Domain-Invarianten (Value Objects, Aggregates) werden ab US-002 in eigenen Testklassen
/// abgedeckt.
/// </summary>
public class ScaffoldingSanityTests
{
    [Fact]
    public void DomainTestProject_IsConfiguredAndRunnable()
    {
        var result = 1 + 1;

        result.Should().Be(2);
    }
}
