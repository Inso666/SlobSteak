using Testcontainers.PostgreSql;

namespace SlobSteak.Api.Tests.Persistence;

/// <summary>
/// Startet eine echte PostgreSQL-Instanz über Testcontainers für die Dauer der Testklassen in
/// der <see cref="PostgresCollection"/>. Wird als <c>ICollectionFixture</c> genau einmal für alle
/// beteiligten Testklassen gestartet, um nicht pro Testklasse einen eigenen Container hochfahren
/// zu müssen (US-003, Akzeptanzkriterium: Integrationstest gegen eine Testcontainers-
/// PostgreSQL-Instanz).
/// </summary>
public sealed class PostgresContainerFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:16-alpine")
        .WithDatabase("slobsteak_test")
        .WithUsername("slobsteak")
        .WithPassword("slobsteak")
        .Build();

    public string ConnectionString => _container.GetConnectionString();

    public Task InitializeAsync() => _container.StartAsync();

    public Task DisposeAsync() => _container.DisposeAsync().AsTask();
}

[CollectionDefinition(Name)]
public sealed class PostgresCollection : ICollectionFixture<PostgresContainerFixture>
{
    public const string Name = "Postgres";
}
