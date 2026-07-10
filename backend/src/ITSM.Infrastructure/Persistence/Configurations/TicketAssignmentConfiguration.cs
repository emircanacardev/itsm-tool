using ITSM.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ITSM.Infrastructure.Persistence.Configurations;

public class TicketAssignmentConfiguration : IEntityTypeConfiguration<TicketAssignment>
{
    public void Configure(EntityTypeBuilder<TicketAssignment> builder)
    {
        builder.HasOne(a => a.AssignedFromUser)
            .WithMany()
            .HasForeignKey(a => a.AssignedFrom);

        builder.HasOne(a => a.AssignedToUser)
            .WithMany()
            .HasForeignKey(a => a.AssignedTo)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.AssignedByUser)
            .WithMany()
            .HasForeignKey(a => a.AssignedBy)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
