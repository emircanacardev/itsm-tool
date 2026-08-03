using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ITSM.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceNotificationMessageWithPayload : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Temiz kesim: mevcut bildirimler siliniyor.
            //
            // Eski satırlar cümleyi Message kolonunda hazır metin olarak
            // tutuyordu; yeni model tür + PayloadJson saklıyor. Eski kayıtlar
            // için payload üretilemeyeceğinden (cümleyi geri ayrıştırmak
            // gerekirdi) taşınmıyorlar - aksi halde PayloadJson'ı boş kalır ve
            // bildirim listesinde boş satır olarak görünürlerdi.
            //
            // SlaBreaches tablosuna dokunulmuyor: o kayıtlar "bu ihlal için
            // bildirim gönderildi" işareti olarak duruyor. Silinselerdi arka
            // plan servisi geçmiş ihlalleri yeniden tespit edip kullanıcılara
            // toplu bildirim/e-posta gönderirdi.
            migrationBuilder.Sql("DELETE FROM \"Notifications\";");

            migrationBuilder.DropColumn(
                name: "Message",
                table: "Notifications");

            migrationBuilder.AddColumn<string>(
                name: "PayloadJson",
                table: "Notifications",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PayloadJson",
                table: "Notifications");

            migrationBuilder.AddColumn<string>(
                name: "Message",
                table: "Notifications",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
