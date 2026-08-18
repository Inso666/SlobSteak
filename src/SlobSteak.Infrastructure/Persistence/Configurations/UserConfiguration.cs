using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Shared.ValueObjects;

namespace SlobSteak.Infrastructure.Persistence.Configurations;

/// <summary>Fluent-API-Konfiguration für <see cref="User"/> (PRD Abschnitt 4.1, Tabelle <c>users</c>).</summary>
public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.Name)
            .IsRequired();

        builder.Property(u => u.Email)
            .HasConversion(email => email.Value, value => new Email(value))
            .IsRequired();

        builder.HasIndex(u => u.Email)
            .IsUnique();

        builder.Property(u => u.PasswordHash)
            .IsRequired();

        builder.Property(u => u.IsSystemAdmin)
            .IsRequired();

        builder.Property(u => u.MustChangePassword)
            .IsRequired();

        builder.Property(u => u.CreatedAt)
            .IsRequired();
    }
}
