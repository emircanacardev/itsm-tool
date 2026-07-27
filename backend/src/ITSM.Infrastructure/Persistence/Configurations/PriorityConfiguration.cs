using ITSM.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ITSM.Infrastructure.Persistence.Configurations;

public class PriorityConfiguration : IEntityTypeConfiguration<Priority>
{
    public void Configure(EntityTypeBuilder<Priority> builder)
    {
        builder.HasIndex(p => p.Name).IsUnique();
        builder.Property(p => p.Name).HasMaxLength(50);

        builder.HasData(
            new Priority { Id = 10, Name = "Kritik", SortOrder = 10 },
            new Priority { Id = 20, Name = "Yüksek", SortOrder = 20 },
            new Priority { Id = 30, Name = "Orta", SortOrder = 30 },
            new Priority { Id = 40, Name = "Düşük", SortOrder = 40 }
        );
    }
}