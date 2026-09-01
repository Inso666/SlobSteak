using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SlobSteak.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectUpdatedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_project_memberships_projects_project_id",
                table: "project_memberships");

            migrationBuilder.DropForeignKey(
                name: "fk_stakeholder_communication_assignments_stakeholders_stakehol",
                table: "stakeholder_communication_assignments");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "updated_at",
                table: "projects",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            // US-076 Akzeptanzkriterium 1: "initial gleich CreatedAt" gilt auch für bereits
            // bestehende Projekte, nicht nur für künftig über Project.Create angelegte — die obige
            // AddColumn-Defaultwert (0001-01-01) ist ausschließlich das für NOT NULL erforderliche
            // Backfill-Platzhalter, das hier sofort durch den fachlich korrekten Wert ersetzt wird.
            migrationBuilder.Sql("UPDATE projects SET updated_at = created_at;");

            migrationBuilder.AddForeignKey(
                name: "fk_project_memberships_projects_project_id",
                table: "project_memberships",
                column: "project_id",
                principalTable: "projects",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_stakeholder_communication_assignments_stakeholders_stakehol",
                table: "stakeholder_communication_assignments",
                column: "stakeholder_id",
                principalTable: "stakeholders",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_project_memberships_projects_project_id",
                table: "project_memberships");

            migrationBuilder.DropForeignKey(
                name: "fk_stakeholder_communication_assignments_stakeholders_stakehol",
                table: "stakeholder_communication_assignments");

            migrationBuilder.DropColumn(
                name: "updated_at",
                table: "projects");

            migrationBuilder.AddForeignKey(
                name: "fk_project_memberships_projects_project_id",
                table: "project_memberships",
                column: "project_id",
                principalTable: "projects",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_stakeholder_communication_assignments_stakeholders_stakehol",
                table: "stakeholder_communication_assignments",
                column: "stakeholder_id",
                principalTable: "stakeholders",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
