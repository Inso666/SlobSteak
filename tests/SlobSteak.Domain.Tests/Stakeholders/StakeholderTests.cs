using FluentAssertions;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Domain.Tests.Stakeholders;

/// <summary>Unit-Tests für das <see cref="Stakeholder"/>-Aggregate (US-020) — ohne Datenbank,
/// Netzwerk oder Dateisystem (CLAUDE.md Abschnitt 2).</summary>
public class StakeholderTests
{
    [Fact]
    public void Create_ValidData_ProducesInstance_WithProvidedFields()
    {
        var projectId = Guid.NewGuid();
        var createdBy = Guid.NewGuid();

        var stakeholder = Stakeholder.Create(
            projectId, StakeholderType.Person, "Max Mustermann", "ACME GmbH", "CTO",
            "max@example.com", "+49 123", "Berlin", "Beschreibung", createdBy);

        stakeholder.ProjectId.Should().Be(projectId);
        stakeholder.Type.Should().Be(StakeholderType.Person);
        stakeholder.Name.Should().Be("Max Mustermann");
        stakeholder.Organization.Should().Be("ACME GmbH");
        stakeholder.Position.Should().Be("CTO");
        stakeholder.Email!.Value.Should().Be("max@example.com");
        stakeholder.CreatedBy.Should().Be(createdBy);
        stakeholder.UpdatedBy.Should().Be(createdBy);
        stakeholder.IsDeleted().Should().BeFalse();
    }

    // AC 1: Stakeholder.Create wirft StakeholderNameRequiredError, wenn name leer ist.
    [Fact]
    public void Create_BlankName_ThrowsStakeholderNameRequiredError()
    {
        var act = () => Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "   ", null, null, null, null, null, null, Guid.NewGuid());

        act.Should().Throw<StakeholderNameRequiredError>();
    }

    // AC 2: Stakeholder.Create wirft InvalidEmailFormatError, wenn email gesetzt, aber ungültig
    // formatiert ist; leeres email-Feld ist zulässig.
    [Fact]
    public void Create_InvalidEmailFormat_ThrowsInvalidEmailFormatError()
    {
        var act = () => Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, "keine-email",
            null, null, null, Guid.NewGuid());

        act.Should().Throw<InvalidEmailFormatError>();
    }

    [Fact]
    public void Create_NullOrBlankEmail_IsAllowed_LeavesEmailNull()
    {
        var stakeholder = Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, "   ",
            null, null, null, Guid.NewGuid());

        stakeholder.Email.Should().BeNull();
    }

    // AC 3: type = Organization erlaubt position weiterhin als optionales Feld (keine
    // Domain-Restriktion).
    [Fact]
    public void Create_OrganizationType_StillAcceptsPosition()
    {
        var stakeholder = Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Organization, "ACME GmbH", null, "Hauptsitz", null,
            null, null, null, Guid.NewGuid());

        stakeholder.Type.Should().Be(StakeholderType.Organization);
        stakeholder.Position.Should().Be("Hauptsitz");
    }

    // AC 4: Stakeholder.UpdateDetails(fields, updatedBy) aktualisiert updated_by/updated_at bei
    // jeder Änderung.
    [Fact]
    public void UpdateDetails_ChangesUpdatedByAndUpdatedAt()
    {
        var stakeholder = Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid());
        var originalUpdatedAt = stakeholder.UpdatedAt;
        var updatedBy = Guid.NewGuid();

        stakeholder.UpdateDetails(
            StakeholderType.Person, "Max Mustermann (aktualisiert)", "Neue Org", "Neue Position",
            null, null, null, null, updatedBy);

        stakeholder.Name.Should().Be("Max Mustermann (aktualisiert)");
        stakeholder.Organization.Should().Be("Neue Org");
        stakeholder.UpdatedBy.Should().Be(updatedBy);
        stakeholder.UpdatedAt.Should().BeOnOrAfter(originalUpdatedAt);
    }

    [Fact]
    public void UpdateDetails_BlankName_ThrowsStakeholderNameRequiredError()
    {
        var stakeholder = Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid());

        var act = () => stakeholder.UpdateDetails(
            StakeholderType.Person, "  ", null, null, null, null, null, null, Guid.NewGuid());

        act.Should().Throw<StakeholderNameRequiredError>();
    }

    // AC 5: Stakeholder.SoftDelete(deletedBy) setzt deleted_at/deleted_by; erneuter Aufruf auf
    // einem bereits gelöschten Stakeholder ist idempotent und ändert deleted_at nicht.
    [Fact]
    public void SoftDelete_SetsDeletedAtAndDeletedBy()
    {
        var stakeholder = Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid());
        var deletedBy = Guid.NewGuid();

        stakeholder.SoftDelete(deletedBy);

        stakeholder.DeletedAt.Should().NotBeNull();
        stakeholder.DeletedBy.Should().Be(deletedBy);
        stakeholder.IsDeleted().Should().BeTrue();
    }

    [Fact]
    public void SoftDelete_CalledTwice_IsIdempotent_DoesNotChangeDeletedAt()
    {
        var stakeholder = Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid());
        stakeholder.SoftDelete(Guid.NewGuid());
        var firstDeletedAt = stakeholder.DeletedAt;
        var firstDeletedBy = stakeholder.DeletedBy;

        stakeholder.SoftDelete(Guid.NewGuid());

        stakeholder.DeletedAt.Should().Be(firstDeletedAt);
        stakeholder.DeletedBy.Should().Be(firstDeletedBy);
    }

    // AC 6: Stakeholder.Restore() setzt deleted_at/deleted_by auf null zurück.
    [Fact]
    public void Restore_ClearsDeletedAtAndDeletedBy()
    {
        var stakeholder = Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid());
        stakeholder.SoftDelete(Guid.NewGuid());

        stakeholder.Restore();

        stakeholder.DeletedAt.Should().BeNull();
        stakeholder.DeletedBy.Should().BeNull();
        stakeholder.IsDeleted().Should().BeFalse();
    }

    // AC 7: Stakeholder.IsDeleted() gibt true zurück, wenn deleted_at gesetzt ist.
    [Fact]
    public void IsDeleted_ReturnsFalse_WhenNotDeleted()
    {
        var stakeholder = Stakeholder.Create(
            Guid.NewGuid(), StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid());

        stakeholder.IsDeleted().Should().BeFalse();
    }
}
