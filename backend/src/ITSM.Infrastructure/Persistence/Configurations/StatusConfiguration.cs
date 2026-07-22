using ITSM.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ITSM.Infrastructure.Persistence.Configurations;

public class StatusConfiguration : IEntityTypeConfiguration<Status>
{
    public void Configure(EntityTypeBuilder<Status> builder)
    {
        builder.HasIndex(s => s.Name).IsUnique();
        builder.Property(s => s.Name).HasMaxLength(50);

        builder.HasData(
            new Status { Id = 10, Name = "Açık", SortOrder = 10 },
            new Status { Id = 20, Name = "Devam Ediyor", SortOrder = 20 },
            new Status { Id = 30, Name = "Beklemede", SortOrder = 30 },
            new Status { Id = 40, Name = "Çözüldü", SortOrder = 40 },
            new Status { Id = 50, Name = "Kapatıldı", SortOrder = 50 }
        );
    }
}
