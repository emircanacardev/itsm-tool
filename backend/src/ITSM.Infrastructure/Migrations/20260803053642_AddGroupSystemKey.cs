using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ITSM.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddGroupSystemKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SystemKey",
                table: "Groups",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            // Mevcut varsayılan grubu anahtarla eşleştiriyoruz. Bu satır
            // olmadan AuthService.RegisterAsync varsayılan grubu bulamaz ve
            // yeni kullanıcı kaydı sessizce başarısız olur.
            //
            // Ada göre eşleştirme burada tek seferlik ve bilinçli: kolon yeni
            // eklendiği için elde başka bir tutamak yok. Bundan sonra kod
            // gruba her zaman SystemKey üzerinden ulaşacak.
            migrationBuilder.Sql(
                """
                UPDATE "Groups"
                SET "SystemKey" = 'UNASSIGNED'
                WHERE "Name" = 'Atanmamış'
                  AND NOT EXISTS (SELECT 1 FROM "Groups" WHERE "SystemKey" = 'UNASSIGNED');
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Groups_SystemKey",
                table: "Groups",
                column: "SystemKey",
                unique: true,
                filter: "\"SystemKey\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Groups_SystemKey",
                table: "Groups");

            migrationBuilder.DropColumn(
                name: "SystemKey",
                table: "Groups");
        }
    }
}
