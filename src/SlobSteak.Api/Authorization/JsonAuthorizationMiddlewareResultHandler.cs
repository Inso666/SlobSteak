using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;

namespace SlobSteak.Api.Authorization;

/// <summary>
/// Formt die von der eingebauten <c>AuthorizationMiddleware</c> erzeugten <c>403 Forbidden</c>-
/// Antworten auf den projektweiten Fehler-Contract <c>{"error":"FORBIDDEN"}</c> um (US-007
/// Akzeptanzkriterien 1–2). Die Standardimplementierung liefert 403 ohne Body — ein
/// <see cref="IAuthorizationMiddlewareResultHandler"/> ist der vorgesehene Erweiterungspunkt dafür,
/// da dieser Kurzschluss vor Erreichen eines Controllers (und damit vor der zentralen
/// Domain-Exception-Middleware) stattfindet.
/// </summary>
public sealed class JsonAuthorizationMiddlewareResultHandler : IAuthorizationMiddlewareResultHandler
{
    private readonly AuthorizationMiddlewareResultHandler _defaultHandler = new();

    public async Task HandleAsync(
        RequestDelegate next,
        HttpContext context,
        AuthorizationPolicy policy,
        PolicyAuthorizationResult authorizeResult)
    {
        if (authorizeResult.Forbidden)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { error = "FORBIDDEN" }));
            return;
        }

        await _defaultHandler.HandleAsync(next, context, policy, authorizeResult);
    }
}
