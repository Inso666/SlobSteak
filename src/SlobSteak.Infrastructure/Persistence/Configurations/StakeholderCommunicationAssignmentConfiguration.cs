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

        // Stakeholder und StakeholderCommunicationAssignment bilden gemeinsam ein Aggregate
        // (US-039) — dafür eine echte EF-Navigation (Stakeholder.CommunicationAssignments), damit
        // der Aggregate Root seine Kind-Entities beim Laden/Speichern konsistent verwaltet.
        // CommunicationType gehört dagegen zu einem anderen Bounded Context (CommunicationCatalog)
        // und bleibt daher eine reine ID-Fremdschlüssel-Referenz ohne Navigation — CLAUDE.md
        // Abschnitt 3.1 untersagt EF-Navigation nur über Aggregate-/Kontextgrenzen hinweg, nicht
        // innerhalb eines Aggregates (siehe ADR-0001). ClientCascade (statt Restrict) für die
        // Stakeholder-Beziehung: Entfernt Stakeholder.RemoveCommunicationAssignment (US-039) ein
        // Element aus der geladenen CommunicationAssignments-Navigation, muss EF Core dies als
        // Löschung behandeln, nicht als (bei einem Pflicht-Fremdschlüssel unmöglichen) Aushängen
        // der Beziehung — die eigentliche DB-Spalte bleibt weiterhin ON DELETE RESTRICT
        // (ClientCascade wirkt nur im Change Tracker, nicht auf Schema-Ebene, daher keine neue
        // Migration nötig, siehe ADR-0006).
        builder.HasOne<Stakeholder>()
            .WithMany(s => s.CommunicationAssignments)
            .HasForeignKey(a => a.StakeholderId)
            .OnDelete(DeleteBehavior.ClientCascade);

        builder.HasOne<CommunicationType>()
            .WithMany()
            .HasForeignKey(a => a.CommunicationTypeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
