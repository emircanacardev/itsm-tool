using ITSM.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ITSM.Infrastructure.Persistence.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.Property(n => n.Type).HasMaxLength(50);

        // Cümleyi kurmak için gereken değişken veriler jsonb olarak saklanıyor.
        // Postgres'in jsonb tipi ileride payload üzerinden sorgulama/indeksleme
        // gerekirse text'e göre avantaj sağlıyor.
        builder.Property(n => n.PayloadJson).HasColumnType("jsonb");

        builder.HasOne(n => n.Ticket)
            .WithMany()
            .HasForeignKey(n => n.TicketId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
