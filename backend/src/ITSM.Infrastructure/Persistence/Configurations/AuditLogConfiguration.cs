using ITSM.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ITSM.Infrastructure.Persistence.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.Property(a => a.EntityName).HasMaxLength(100);
        builder.Property(a => a.Action).HasMaxLength(50);
        builder.HasIndex(a => new { a.EntityName, a.EntityId });
    }
}
