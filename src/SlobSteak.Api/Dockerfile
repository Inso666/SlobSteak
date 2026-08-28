# syntax=docker/dockerfile:1
# Multi-Stage-Build für SlobSteak.Api gemäß US-001 (Abschnitt 1.5: keine Cloud-Pflichtabhängigkeit).
# Build-Context ist der Repository-Root, da die gesamte Solution referenziert wird.

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Projektdateien zuerst kopieren, um NuGet-Restore-Layer zu cachen.
COPY SlobSteak.sln ./
COPY src/SlobSteak.Domain/SlobSteak.Domain.csproj src/SlobSteak.Domain/
COPY src/SlobSteak.Application/SlobSteak.Application.csproj src/SlobSteak.Application/
COPY src/SlobSteak.Infrastructure/SlobSteak.Infrastructure.csproj src/SlobSteak.Infrastructure/
COPY src/SlobSteak.Api/SlobSteak.Api.csproj src/SlobSteak.Api/
RUN dotnet restore src/SlobSteak.Api/SlobSteak.Api.csproj

# Restlichen Quellcode kopieren und veröffentlichen.
COPY src/ src/
RUN dotnet publish src/SlobSteak.Api/SlobSteak.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# US-049: curl wird ausschließlich für den docker-compose-Healthcheck gegen /api/v1/health benötigt
# (Akzeptanzkriterium 2) — das Basis-Image (Debian bookworm-slim) bringt weder curl noch wget mit.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "SlobSteak.Api.dll"]
