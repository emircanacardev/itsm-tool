using ITSM.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ITSM.Infrastructure.Persistence.Configurations;

public class AutoAssignmentRuleConfiguration : IEntityTypeConfiguration<AutoAssignmentRule>
{
    public void Configure(EntityTypeBuilder<AutoAssignmentRule> builder)
    {
        builder.ToTable(t => t.HasCheckConstraint(
            "CK_AutoAssignmentRule_UserOrGroup",
            "\"AssignToUserId\" IS NOT NULL OR \"AssignToGroupId\" IS NOT NULL"));

        builder.HasOne(r => r.Category)
            .WithMany()
            .HasForeignKey(r => r.CategoryId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
