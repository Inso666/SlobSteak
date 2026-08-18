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

        // Project und ProjectMembership bilden gemeinsam ein Aggregate (US-011) — dafür eine echte
        // EF-Navigation (Project.Memberships), damit der Aggregate Root seine Kind-Entities beim
        // Laden/Speichern konsistent verwaltet. User gehört dagegen zu einem anderen Bounded
        // Context (IdentityAccess) und bleibt daher eine reine ID-Fremdschlüssel-Referenz ohne
        // Navigation — CLAUDE.md Abschnitt 3.1 untersagt EF-Navigation nur über
        // Aggregate-/Kontextgrenzen hinweg, nicht innerhalb eines Aggregates (siehe ADR-0001).
        // ClientCascade (statt Restrict) für die Project-Beziehung: Entfernt Project.RemoveMember
        // (US-011) ein Element aus der geladenen Memberships-Navigation, muss EF Core dies als
        // Löschung behandeln, nicht als (bei einem Pflicht-Fremdschlüssel unmöglichen) Aushängen
        // der Beziehung — die eigentliche DB-Spalte bleibt weiterhin ON DELETE RESTRICT
        // (ClientCascade wirkt nur im Change Tracker, nicht auf Schema-Ebene, daher keine neue
        // Migration nötig).
        builder.HasOne<Project>()
            .WithMany(p => p.Memberships)
            .HasForeignKey(pm => pm.ProjectId)
            .OnDelete(DeleteBehavior.ClientCascade);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(pm => pm.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
