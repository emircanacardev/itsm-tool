using ITSM.Domain.Constants;
using ITSM.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ITSM.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasIndex(u => u.Email).IsUnique();
        builder.Property(u => u.Email).HasMaxLength(255);
        builder.Property(u => u.FullName).HasMaxLength(200);
        builder.Property(u => u.PasswordHash).HasMaxLength(255);

        // Mevcut satırlar için de varsayılan dolsun diye DB tarafında default veriyoruz.
        builder.Property(u => u.PreferredLanguage)
            .HasMaxLength(5)
            .HasDefaultValue(SupportedLanguages.Default);
    }
}
