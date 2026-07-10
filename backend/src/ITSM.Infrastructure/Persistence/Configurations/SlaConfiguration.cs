using ITSM.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ITSM.Infrastructure.Persistence.Configurations;

public class SlaConfiguration : IEntityTypeConfiguration<Sla>
{
    public void Configure(EntityTypeBuilder<Sla> builder)
    {
        builder.HasIndex(s => new { s.ProjectId, s.CategoryId, s.PriorityId }).IsUnique();

        builder.HasOne(s => s.Project)
            .WithMany()
            .HasForeignKey(s => s.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.Category)
            .WithMany()
            .HasForeignKey(s => s.CategoryId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.Priority)
            .WithMany()
            .HasForeignKey(s => s.PriorityId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
