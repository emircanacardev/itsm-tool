using ITSM.Domain.Constants;
using ITSM.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ITSM.Infrastructure.Persistence.Configurations;

public class PriorityTranslationConfiguration : IEntityTypeConfiguration<PriorityTranslation>
{
    public void Configure(EntityTypeBuilder<PriorityTranslation> builder)
    {
        builder.HasKey(t => new { t.PriorityId, t.LanguageCode });

        builder.Property(t => t.LanguageCode).HasMaxLength(5);
        builder.Property(t => t.Name).HasMaxLength(50);

        builder.HasOne(t => t.Priority)
            .WithMany(p => p.Translations)
            .HasForeignKey(t => t.PriorityId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasData(
            new PriorityTranslation { PriorityId = TicketPriorities.Kritik, LanguageCode = SupportedLanguages.Turkish, Name = "Kritik" },
            new PriorityTranslation { PriorityId = TicketPriorities.Yuksek, LanguageCode = SupportedLanguages.Turkish, Name = "Yüksek" },
            new PriorityTranslation { PriorityId = TicketPriorities.Orta, LanguageCode = SupportedLanguages.Turkish, Name = "Orta" },
            new PriorityTranslation { PriorityId = TicketPriorities.Dusuk, LanguageCode = SupportedLanguages.Turkish, Name = "Düşük" },

            new PriorityTranslation { PriorityId = TicketPriorities.Kritik, LanguageCode = SupportedLanguages.English, Name = "Critical" },
            new PriorityTranslation { PriorityId = TicketPriorities.Yuksek, LanguageCode = SupportedLanguages.English, Name = "High" },
            new PriorityTranslation { PriorityId = TicketPriorities.Orta, LanguageCode = SupportedLanguages.English, Name = "Medium" },
            new PriorityTranslation { PriorityId = TicketPriorities.Dusuk, LanguageCode = SupportedLanguages.English, Name = "Low" }
        );
    }
}
