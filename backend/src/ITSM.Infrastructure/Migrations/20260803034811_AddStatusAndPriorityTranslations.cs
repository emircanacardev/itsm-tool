using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ITSM.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStatusAndPriorityTranslations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PriorityTranslations",
                columns: table => new
                {
                    PriorityId = table.Column<long>(type: "bigint", nullable: false),
                    LanguageCode = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PriorityTranslations", x => new { x.PriorityId, x.LanguageCode });
                    table.ForeignKey(
                        name: "FK_PriorityTranslations_Priorities_PriorityId",
                        column: x => x.PriorityId,
                        principalTable: "Priorities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StatusTranslations",
                columns: table => new
                {
                    StatusId = table.Column<long>(type: "bigint", nullable: false),
                    LanguageCode = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StatusTranslations", x => new { x.StatusId, x.LanguageCode });
                    table.ForeignKey(
                        name: "FK_StatusTranslations_Statuses_StatusId",
                        column: x => x.StatusId,
                        principalTable: "Statuses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "PriorityTranslations",
                columns: new[] { "LanguageCode", "PriorityId", "Name" },
                values: new object[,]
                {
                    { "en", 10L, "Critical" },
                    { "tr", 10L, "Kritik" },
                    { "en", 20L, "High" },
                    { "tr", 20L, "Yüksek" },
                    { "en", 30L, "Medium" },
                    { "tr", 30L, "Orta" },
                    { "en", 40L, "Low" },
                    { "tr", 40L, "Düşük" }
                });

            migrationBuilder.InsertData(
                table: "StatusTranslations",
                columns: new[] { "LanguageCode", "StatusId", "Name" },
                values: new object[,]
                {
                    { "en", 10L, "Open" },
                    { "tr", 10L, "Açık" },
                    { "en", 20L, "In Progress" },
                    { "tr", 20L, "Devam Ediyor" },
                    { "en", 30L, "On Hold" },
                    { "tr", 30L, "Beklemede" },
                    { "en", 40L, "Resolved" },
                    { "tr", 40L, "Çözüldü" },
                    { "en", 50L, "Closed" },
                    { "tr", 50L, "Kapatıldı" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PriorityTranslations");

            migrationBuilder.DropTable(
                name: "StatusTranslations");
        }
    }
}
