using ITSM.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ITSM.Infrastructure.Persistence.Configurations;

public class KnowledgeBaseArticleConfiguration : IEntityTypeConfiguration<KnowledgeBaseArticle>
{
    public void Configure(EntityTypeBuilder<KnowledgeBaseArticle> builder)
    {
        builder.Property(k => k.Title).HasMaxLength(255);

        builder.HasOne(k => k.Project)
            .WithMany()
            .HasForeignKey(k => k.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(k => k.Category)
            .WithMany()
            .HasForeignKey(k => k.CategoryId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(k => k.CreatedByUser)
            .WithMany()
            .HasForeignKey(k => k.CreatedBy)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
