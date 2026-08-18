using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Reflection;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using SlobSteak.Api.Tests.Persistence;
using SlobSteak.Domain.Assessments;
using SlobSteak.Domain.Communications;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Stakeholders;
using SlobSteak.Infrastructure.Persistence;

namespace SlobSteak.Api.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-003 (Datenbankschema & Migrationen für alle Aggregate). Prüft
/// ausschließlich die in <c>docs/usecases/US-003-datenbankschema.md</c> gelisteten
/// Akzeptanzkriterien, ein <see cref="FactAttribute"/> je Kriterium, in derselben Reihenfolge wie
/// im Story-Dokument, gegen eine echte Testcontainers-PostgreSQL-Instanz.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class US003_DatenbankschemaTests : IAsyncLifetime
{
    private static readonly Type[] ConfiguredEntityTypes =
    {
        typeof(User), typeof(Project), typeof(ProjectMembership), typeof(Stakeholder),
        typeof(StakeholderAssessment), typeof(CommunicationType), typeof(StakeholderCommunicationAssignment),
    };

    private readonly SlobSteakApiFactory _factory;

    public US003_DatenbankschemaTests(PostgresContainerFixture postgres)
    {
        _factory = SlobSteakApiFactory.WithConnectionString(postgres.ConnectionString);
    }

    public async Task InitializeAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();
        await dbContext.Database.MigrateAsync();
    }

    public Task DisposeAsync()
    {
        _factory.Dispose();
        return Task.CompletedTask;
    }

    // AC 1: SlobSteakDbContext definiert DbSet<User>, DbSet<Project>, DbSet<ProjectMembership>,
    // DbSet<Stakeholder>, DbSet<StakeholderAssessment>, DbSet<CommunicationType>,
    // DbSet<StakeholderCommunicationAssignment>.
    [Fact]
    public void AC1_DbContext_DefinesDbSetsForAllSevenAggregates()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        dbContext.Users.Should().NotBeNull();
        dbContext.Projects.Should().NotBeNull();
        dbContext.ProjectMemberships.Should().NotBeNull();
        dbContext.Stakeholders.Should().NotBeNull();
        dbContext.StakeholderAssessments.Should().NotBeNull();
        dbContext.CommunicationTypes.Should().NotBeNull();
        dbContext.StakeholderCommunicationAssignments.Should().NotBeNull();

        foreach (var entityType in ConfiguredEntityTypes)
        {
            dbContext.Model.FindEntityType(entityType).Should().NotBeNull(
                $"{entityType.Name} sollte im EF-Core-Modell registriert sein");
        }
    }

    // AC 2: Je Entität existiert eine IEntityTypeConfiguration<T>-Klasse (Fluent API) — keine
    // Konfiguration per Data-Annotations auf den Domain-Klassen.
    [Fact]
    public void AC2_DomainEntities_CarryNoDataAnnotationAttributes()
    {
        var dataAnnotationAttributeTypes = new[]
        {
            typeof(KeyAttribute), typeof(RequiredAttribute), typeof(MaxLengthAttribute),
            typeof(StringLengthAttribute), typeof(TableAttribute), typeof(ColumnAttribute),
            typeof(ForeignKeyAttribute), typeof(IndexAttribute),
        };

        foreach (var entityType in ConfiguredEntityTypes)
        {
            var members = entityType
                .GetProperties(BindingFlags.Public | BindingFlags.Instance)
                .Cast<MemberInfo>()
                .Append(entityType);

            foreach (var member in members)
            {
                var offendingAttribute = member.GetCustomAttributes()
                    .Select(a => a.GetType())
                    .FirstOrDefault(t => dataAnnotationAttributeTypes.Contains(t));

                offendingAttribute.Should().BeNull(
                    $"{entityType.Name}.{member.Name} sollte keine EF-Core-Data-Annotation tragen (Fluent API only)");
            }
        }
    }

    // AC 3: ProjectMembershipConfiguration setzt
    // HasIndex(pm => new { pm.ProjectId, pm.UserId }).IsUnique().
    [Fact]
    public void AC3_ProjectMembershipConfiguration_HasUniqueIndexOnProjectIdAndUserId()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        HasUniqueIndex(dbContext, typeof(ProjectMembership), nameof(ProjectMembership.ProjectId), nameof(ProjectMembership.UserId))
            .Should().BeTrue();
    }

    // AC 4: StakeholderAssessmentConfiguration setzt
    // HasIndex(a => new { a.StakeholderId, a.Role }).IsUnique().
    [Fact]
    public void AC4_StakeholderAssessmentConfiguration_HasUniqueIndexOnStakeholderIdAndRole()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        HasUniqueIndex(dbContext, typeof(StakeholderAssessment), nameof(StakeholderAssessment.StakeholderId), nameof(StakeholderAssessment.Role))
            .Should().BeTrue();
    }

    // AC 5: StakeholderCommunicationAssignmentConfiguration setzt
    // HasIndex(a => new { a.StakeholderId, a.CommunicationTypeId }).IsUnique().
    [Fact]
    public void AC5_StakeholderCommunicationAssignmentConfiguration_HasUniqueIndexOnStakeholderIdAndCommunicationTypeId()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        HasUniqueIndex(
                dbContext,
                typeof(StakeholderCommunicationAssignment),
                nameof(StakeholderCommunicationAssignment.StakeholderId),
                nameof(StakeholderCommunicationAssignment.CommunicationTypeId))
            .Should().BeTrue();
    }

    // AC 6: Die initiale Migration erzeugt alle Tabellen; `dotnet ef database update` läuft gegen
    // eine leere PostgreSQL-Instanz fehlerfrei durch, ebenso ein anschließendes
    // `dotnet ef database update 0` (vollständiger Rollback über die generierten Down()-Methoden).
    [Fact]
    public async Task AC6_InitialMigration_AppliesAllTablesAndRollsBackCompletely()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        // InitializeAsync hat die Migration bereits angewendet (entspricht `dotnet ef database
        // update`) — hier verifiziert: alle sieben Tabellen sind abfragbar.
        (await dbContext.Database.GetAppliedMigrationsAsync()).Should().ContainSingle();
        foreach (var setAccessor in new Func<Task<int>>[]
                 {
                     () => dbContext.Users.CountAsync(),
                     () => dbContext.Projects.CountAsync(),
                     () => dbContext.ProjectMemberships.CountAsync(),
                     () => dbContext.Stakeholders.CountAsync(),
                     () => dbContext.StakeholderAssessments.CountAsync(),
                     () => dbContext.CommunicationTypes.CountAsync(),
                     () => dbContext.StakeholderCommunicationAssignments.CountAsync(),
                 })
        {
            var act = setAccessor;
            await act.Should().NotThrowAsync();
        }

        // Entspricht `dotnet ef database update 0`: vollständiger Rollback über Down().
        var migrator = ((IInfrastructure<IServiceProvider>)dbContext).Instance.GetRequiredService<IMigrator>();
        await migrator.MigrateAsync(Migration.InitialDatabase);

        (await dbContext.Database.GetAppliedMigrationsAsync()).Should().BeEmpty();

        // Aufräumen: Schema für eventuell nachfolgende Testinstanzen in derselben Collection
        // wieder herstellen (jede Testklasseninstanz ruft ohnehin ihre eigene InitializeAsync-
        // Migration auf, dies ist zusätzliche Hygiene).
        await migrator.MigrateAsync();
    }

    // AC 7: Integrationstest verifiziert, dass ein Insert-Versuch, der einen der Unique-Indizes
    // verletzt, von PostgreSQL mit DbUpdateException abgelehnt wird — siehe SchemaConstraintsTests
    // für die drei konkreten Fälle (ProjectMembership, StakeholderAssessment,
    // StakeholderCommunicationAssignment). Hier zusätzlich exemplarisch für den Story-Test direkt
    // geprüft, um AC 7 auch innerhalb dieser dedizierten Testklasse nachzuweisen.
    [Fact]
    public async Task AC7_UniqueConstraintViolation_IsRejectedWithDbUpdateException()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SlobSteakDbContext>();

        var name = $"AC7-Katalogeintrag-{Guid.NewGuid():N}";
        dbContext.CommunicationTypes.Add(new CommunicationType(Guid.NewGuid(), name, true, DateTimeOffset.UtcNow));
        await dbContext.SaveChangesAsync();

        dbContext.CommunicationTypes.Add(new CommunicationType(Guid.NewGuid(), name, true, DateTimeOffset.UtcNow));
        var act = async () => await dbContext.SaveChangesAsync();

        await act.Should().ThrowAsync<DbUpdateException>();
    }

    private static bool HasUniqueIndex(SlobSteakDbContext dbContext, Type clrType, params string[] propertyNames)
    {
        var entityType = dbContext.Model.FindEntityType(clrType);
        entityType.Should().NotBeNull();

        return entityType!.GetIndexes().Any(index =>
            index.IsUnique &&
            index.Properties.Select(p => p.Name).SequenceEqual(propertyNames));
    }
}
