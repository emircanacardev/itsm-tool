using ITSM.Domain.Constants;
using ITSM.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ITSM.Infrastructure.Persistence.Configurations;

public class StatusTranslationConfiguration : IEntityTypeConfiguration<StatusTranslation>
{
    public void Configure(EntityTypeBuilder<StatusTranslation> builder)
    {
        // Bir durumun her dilde en fazla bir karşılığı olabilir.
        builder.HasKey(t => new { t.StatusId, t.LanguageCode });

        builder.Property(t => t.LanguageCode).HasMaxLength(5);
        builder.Property(t => t.Name).HasMaxLength(50);

        builder.HasOne(t => t.Status)
            .WithMany(s => s.Translations)
            .HasForeignKey(t => t.StatusId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasData(
            new StatusTranslation { StatusId = TicketStatuses.Acik, LanguageCode = SupportedLanguages.Turkish, Name = "Açık" },
            new StatusTranslation { StatusId = TicketStatuses.DevamEdiyor, LanguageCode = SupportedLanguages.Turkish, Name = "Devam Ediyor" },
            new StatusTranslation { StatusId = TicketStatuses.Beklemede, LanguageCode = SupportedLanguages.Turkish, Name = "Beklemede" },
            new StatusTranslation { StatusId = TicketStatuses.Cozuldu, LanguageCode = SupportedLanguages.Turkish, Name = "Çözüldü" },
            new StatusTranslation { StatusId = TicketStatuses.Kapatildi, LanguageCode = SupportedLanguages.Turkish, Name = "Kapatıldı" },

            new StatusTranslation { StatusId = TicketStatuses.Acik, LanguageCode = SupportedLanguages.English, Name = "Open" },
            new StatusTranslation { StatusId = TicketStatuses.DevamEdiyor, LanguageCode = SupportedLanguages.English, Name = "In Progress" },
            new StatusTranslation { StatusId = TicketStatuses.Beklemede, LanguageCode = SupportedLanguages.English, Name = "On Hold" },
            new StatusTranslation { StatusId = TicketStatuses.Cozuldu, LanguageCode = SupportedLanguages.English, Name = "Resolved" },
            new StatusTranslation { StatusId = TicketStatuses.Kapatildi, LanguageCode = SupportedLanguages.English, Name = "Closed" }
        );
    }
}
