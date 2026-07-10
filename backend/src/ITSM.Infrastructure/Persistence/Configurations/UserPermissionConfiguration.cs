using ITSM.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ITSM.Infrastructure.Persistence.Configurations;

public class UserPermissionConfiguration : IEntityTypeConfiguration<UserPermission>
{
    public void Configure(EntityTypeBuilder<UserPermission> builder)
    {
        builder.HasIndex(up => new { up.UserId, up.PermissionId, up.ProjectId }).IsUnique();

        builder.HasOne(up => up.Project)
            .WithMany()
            .HasForeignKey(up => up.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
