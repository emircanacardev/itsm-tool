using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ITSM.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixAttachmentUploadedByForeignKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Attachments_Users_UploadedByUserId",
                table: "Attachments");

            migrationBuilder.DropIndex(
                name: "IX_Attachments_UploadedByUserId",
                table: "Attachments");

            migrationBuilder.DropColumn(
                name: "UploadedByUserId",
                table: "Attachments");

            migrationBuilder.CreateIndex(
                name: "IX_Attachments_UploadedBy",
                table: "Attachments",
                column: "UploadedBy");

            migrationBuilder.AddForeignKey(
                name: "FK_Attachments_Users_UploadedBy",
                table: "Attachments",
                column: "UploadedBy",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Attachments_Users_UploadedBy",
                table: "Attachments");

            migrationBuilder.DropIndex(
                name: "IX_Attachments_UploadedBy",
                table: "Attachments");

            migrationBuilder.AddColumn<long>(
                name: "UploadedByUserId",
                table: "Attachments",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.CreateIndex(
                name: "IX_Attachments_UploadedByUserId",
                table: "Attachments",
                column: "UploadedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Attachments_Users_UploadedByUserId",
                table: "Attachments",
                column: "UploadedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
