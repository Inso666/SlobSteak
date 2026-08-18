using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SlobSteak.Domain.Communications;

namespace SlobSteak.Infrastructure.Persistence.Configurations;

/// <summary>Fluent-API-Konfiguration für <see cref="CommunicationType"/> (PRD Abschnitt 4.1, Tabelle <c>communication_types</c>).</summary>
public sealed class CommunicationTypeConfiguration : IEntityTypeConfiguration<CommunicationType>
{
    public void Configure(EntityTypeBuilder<CommunicationType> builder)
    {
        builder.ToTable("communication_types");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Name)
            .IsRequired();

        builder.HasIndex(c => c.Name)
            .IsUnique();

        builder.Property(c => c.IsActive)
            .IsRequired();

        builder.Property(c => c.CreatedAt)
            .IsRequired();
    }
}
