using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Projects;

namespace SlobSteak.Infrastructure.Persistence.Configurations;

/// <summary>
/// Fluent-API-Konfiguration für <see cref="ProjectMembership"/> (PRD Abschnitt 4.1, Tabelle
/// <c>project_memberships</c>). Setzt den Unique-Index, der die zentrale Invariante "höchstens
/// eine Rolle je Nutzer+Projekt" (PRD Abschnitt 4.3 Punkt 2) auf DB-Ebene erzwingt.
/// </summary>
public sealed class ProjectMembershipConfiguration : IEntityTypeConfiguration<ProjectMembership>
{
    public void Configure(EntityTypeBuilder<ProjectMembership> builder)
    {
        builder.ToTable("project_memberships");

        builder.HasKey(pm => pm.Id);

        builder.Property(pm => pm.Role)
            .HasConversion<string>()
            .IsRequired();

        builder.HasIndex(pm => new { pm.ProjectId, pm.UserId })
            .IsUnique();

        // Reine ID-Fremdschlüssel ohne EF-Navigationsproperties auf den Domain-Klassen: Project
        // und ProjectMembership bilden zwar gemeinsam ein Aggregate, User gehört aber zu einem
        // anderen Bounded Context (IdentityAccess) — CLAUDE.md Abschnitt 3.1 untersagt direkte
        // EF-Navigation über Aggregate-/Kontextgrenzen hinweg.
        builder.HasOne<Project>()
            .WithMany()
            .HasForeignKey(pm => pm.ProjectId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(pm => pm.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
