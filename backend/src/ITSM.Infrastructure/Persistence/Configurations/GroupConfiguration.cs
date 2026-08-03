using ITSM.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ITSM.Infrastructure.Persistence.Configurations
{
    public class GroupConfiguration : IEntityTypeConfiguration<Group>
    {
        public void Configure(EntityTypeBuilder<Group> builder)
        {
            builder.Property(g => g.Name).HasMaxLength(150);

            // SystemKey yalnızca sistemin ihtiyaç duyduğu gruplarda dolu.
            // Filtreli unique index: birden fazla grup aynı anahtarı alamaz,
            // ama anahtarsız (kullanıcı tanımlı) grup sayısı sınırsız.
            builder.Property(g => g.SystemKey).HasMaxLength(50);
            builder.HasIndex(g => g.SystemKey)
                .IsUnique()
                .HasFilter("\"SystemKey\" IS NOT NULL");
        }
    }
}
