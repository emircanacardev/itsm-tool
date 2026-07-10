using ITSM.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ITSM.Infrastructure.Persistence.Configurations;

public class SlaBreachConfiguration : IEntityTypeConfiguration<SlaBreach>
{
    public void Configure(EntityTypeBuilder<SlaBreach> builder)
    {
        builder.Property(b => b.BreachType).HasConversion<string>().HasMaxLength(20);
    }
}
