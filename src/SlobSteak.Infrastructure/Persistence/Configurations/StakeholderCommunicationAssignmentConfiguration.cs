using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SlobSteak.Domain.Communications;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Infrastructure.Persistence.Configurations;

/// <summary>
/// Fluent-API-Konfiguration für <see cref="StakeholderCommunicationAssignment"/> (PRD Abschnitt
/// 4.1, Tabelle <c>stakeholder_communication_assignments</c>). Setzt den Unique-Index, der
/// "höchstens eine Zuordnung je Stakeholder+Kommunikationsart" auf DB-Ebene erzwingt.
/// </summary>
public sealed class StakeholderCommunicationAssignmentConfiguration
    : IEntityTypeConfiguration<StakeholderCommunicationAssignment>
{
    public void Configure(EntityTypeBuilder<StakeholderCommunicationAssignment> builder)
    {
        builder.ToTable("stakeholder_communication_assignments");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Frequency)
            .HasConversion<string>()
            .IsRequired();

        builder.Property(a => a.Channel)
            .HasConversion<string>()
            .IsRequired();

        builder.HasIndex(a => new { a.StakeholderId, a.CommunicationTypeId })
            .IsUnique();

        // Reine ID-Fremdschlüssel: StakeholderCommunicationAssignment referenziert Stakeholder
        // (eigenes Aggregate) und CommunicationType (anderer Bounded Context, CommunicationCatalog)
        // ausschließlich über IDs, ohne EF-Navigationsproperties (CLAUDE.md 3.1).
        builder.HasOne<Stakeholder>()
            .WithMany()
            .HasForeignKey(a => a.StakeholderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<CommunicationType>()
            .WithMany()
            .HasForeignKey(a => a.CommunicationTypeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
