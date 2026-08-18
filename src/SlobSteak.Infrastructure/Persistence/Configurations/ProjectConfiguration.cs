using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SlobSteak.Domain.Projects;

namespace SlobSteak.Infrastructure.Persistence.Configurations;

/// <summary>Fluent-API-Konfiguration für <see cref="Project"/> (PRD Abschnitt 4.1, Tabelle <c>projects</c>).</summary>
public sealed class ProjectConfiguration : IEntityTypeConfiguration<Project>
{
    public void Configure(EntityTypeBuilder<Project> builder)
    {
        builder.ToTable("projects");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Name)
            .IsRequired();

        builder.Property(p => p.Description);

        builder.Property(p => p.Status)
            .HasConversion<string>()
            .IsRequired();

        builder.Property(p => p.CreatedAt)
            .IsRequired();
    }
}
