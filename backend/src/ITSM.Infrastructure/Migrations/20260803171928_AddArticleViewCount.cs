using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ITSM.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddArticleViewCount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ViewCount",
                table: "KnowledgeBaseArticles",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ViewCount",
                table: "KnowledgeBaseArticles");
        }
    }
}
