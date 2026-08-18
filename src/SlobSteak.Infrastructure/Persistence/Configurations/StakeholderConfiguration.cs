using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.ValueObjects;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Infrastructure.Persistence.Configurations;

/// <summary>Fluent-API-Konfiguration für <see cref="Stakeholder"/> (PRD Abschnitt 4.1, Tabelle <c>stakeholders</c>).</summary>
public sealed class StakeholderConfiguration : IEntityTypeConfiguration<Stakeholder>
{
    public void Configure(EntityTypeBuilder<Stakeholder> builder)
    {
        builder.ToTable("stakeholders");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Type)
            .HasConversion<string>()
            .IsRequired();

        builder.Property(s => s.Name)
            .IsRequired();

        builder.Property(s => s.Organization);
        builder.Property(s => s.Position);

        builder.Property(s => s.Email)
            .HasConversion(
                email => email == null ? null : email.Value,
                value => value == null ? null : new Email(value));

        builder.Property(s => s.Phone);
        builder.Property(s => s.LocationDepartment);
        builder.Property(s => s.Description);

        builder.Property(s => s.CreatedBy)
            .IsRequired();

        builder.Property(s => s.CreatedAt)
            .IsRequired();

        builder.Property(s => s.UpdatedBy)
            .IsRequired();

        builder.Property(s => s.UpdatedAt)
            .IsRequired();

        // Soft-Delete-Marker: deleted_at IS NULL == aktiv (PRD Abschnitt 4.3 Punkt 5). Standard-
        // Leseabfragen filtern serverseitig darauf; das ist Aufgabe der Repository-Implementierung
        // (US-020), nicht dieser Schema-Konfiguration.
        builder.Property(s => s.DeletedAt);
        builder.Property(s => s.DeletedBy);

        // Reine ID-Fremdschlüssel ohne EF-Navigationsproperties über Kontextgrenzen hinweg
        // (StakeholderManagement -> ProjectManagement/IdentityAccess), siehe CLAUDE.md 3.1.
        builder.HasOne<Project>()
            .WithMany()
            .HasForeignKey(s => s.ProjectId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(s => s.CreatedBy)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(s => s.UpdatedBy)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(s => s.DeletedBy)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
