using FluentAssertions;
using SlobSteak.Domain.Communications;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Domain.Tests.Communications;

/// <summary>
/// Unit-Tests für das <see cref="CommunicationType"/>-Aggregate (US-037): decken jede in
/// <c>docs/usecases/US-037-communication-type-katalog-api.md</c> genannte Verhaltensregel/
/// Invariante ab, ohne Datenbank, Netzwerk oder Dateisystem.
/// </summary>
public class CommunicationTypeTests
{
    [Fact]
    public void Create_WithValidName_ProducesActiveInstance()
    {
        var communicationType = CommunicationType.Create("Newsletter");

        communicationType.Name.Should().Be("Newsletter");
        communicationType.IsActive.Should().BeTrue();
        communicationType.Id.Should().NotBeEmpty();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithBlankName_ThrowsCommunicationTypeNameRequiredError(string blankName)
    {
        var act = () => CommunicationType.Create(blankName);

        act.Should().Throw<CommunicationTypeNameRequiredError>();
    }

    [Fact]
    public void Rename_WithValidName_UpdatesName()
    {
        var communicationType = CommunicationType.Create("Newsletter");

        communicationType.Rename("Statusbericht");

        communicationType.Name.Should().Be("Statusbericht");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Rename_WithBlankName_ThrowsCommunicationTypeNameRequiredError(string blankName)
    {
        var communicationType = CommunicationType.Create("Newsletter");

        var act = () => communicationType.Rename(blankName);

        act.Should().Throw<CommunicationTypeNameRequiredError>();
    }

    [Fact]
    public void Deactivate_SetsIsActiveToFalse_WithoutRemovingEntry()
    {
        var communicationType = CommunicationType.Create("Newsletter");

        communicationType.Deactivate();

        communicationType.IsActive.Should().BeFalse();
        communicationType.Name.Should().Be("Newsletter");
    }

    [Fact]
    public void Deactivate_WhenAlreadyInactive_IsIdempotent()
    {
        var communicationType = CommunicationType.Create("Newsletter");
        communicationType.Deactivate();

        communicationType.Deactivate();

        communicationType.IsActive.Should().BeFalse();
    }

    [Fact]
    public void Activate_AfterDeactivate_SetsIsActiveBackToTrue()
    {
        var communicationType = CommunicationType.Create("Newsletter");
        communicationType.Deactivate();

        communicationType.Activate();

        communicationType.IsActive.Should().BeTrue();
    }

    [Fact]
    public void Activate_WhenAlreadyActive_IsIdempotent()
    {
        var communicationType = CommunicationType.Create("Newsletter");

        communicationType.Activate();

        communicationType.IsActive.Should().BeTrue();
    }
}
