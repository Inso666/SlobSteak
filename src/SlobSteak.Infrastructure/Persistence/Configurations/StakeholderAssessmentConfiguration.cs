using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SlobSteak.Domain.Assessments;
using SlobSteak.Domain.Shared.ValueObjects;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Infrastructure.Persistence.Configurations;

/// <summary>
/// Fluent-API-Konfiguration für <see cref="StakeholderAssessment"/> (PRD Abschnitt 4.1, Tabelle
/// <c>stakeholder_assessments</c>). Setzt den Unique-Index, der die zentrale Invariante
/// "höchstens ein Assessment je Stakeholder+Rolle" (PRD Abschnitt 4.3 Punkt 1) auf DB-Ebene
/// erzwingt, sowie <see cref="StakeholderAssessment.Version"/> als Concurrency-Token
/// (siehe <c>docs/adr/0002-optimistic-concurrency-assessment-version.md</c>).
/// </summary>
public sealed class StakeholderAssessmentConfiguration : IEntityTypeConfiguration<StakeholderAssessment>
{
    public void Configure(EntityTypeBuilder<StakeholderAssessment> builder)
    {
        builder.ToTable("stakeholder_assessments");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Role)
            .HasConversion<string>()
            .IsRequired();

        builder.Property(a => a.Influence)
            .HasConversion(score => score.Value, value => new Score(value))
            .IsRequired();

        builder.Property(a => a.Interest)
            .HasConversion(score => score.Value, value => new Score(value))
            .IsRequired();

        builder.Property(a => a.Notes);

        builder.Property(a => a.UpdatedBy)
            .IsRequired();

        builder.Property(a => a.UpdatedAt)
            .IsRequired();

        builder.Property(a => a.Version)
            .IsRequired()
            .IsConcurrencyToken();

        builder.HasIndex(a => new { a.StakeholderId, a.Role })
            .IsUnique();

        // Reine ID-Fremdschlüssel ohne EF-Navigationsproperty: StakeholderAssessment referenziert
        // Stakeholder per ID über die Bounded-Context-Grenze hinweg (CLAUDE.md 3.1).
        builder.HasOne<Stakeholder>()
            .WithMany()
            .HasForeignKey(a => a.StakeholderId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
