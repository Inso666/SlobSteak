using System.Text.Json;
using SlobSteak.Domain.Identity;

namespace SlobSteak.Api.Auth;

/// <summary>
/// Globale Guard-Middleware (US-008): Solange <see cref="User.MustChangePassword"/> für den
/// angemeldeten Nutzer <c>true</c> ist, liefert jeder authentifizierte Request außerhalb
/// <c>/api/v1/auth/*</c> <c>403 Forbidden</c> mit <c>{"error":"PASSWORD_CHANGE_REQUIRED"}</c> —
/// statt Requests mit unpassender Rolle abzulehnen (das ist Aufgabe der
/// <c>ProjectRole</c>-/<c>SystemAdmin</c>-Policies aus US-007), blockiert dies pauschal JEDEN
/// fachlichen Endpoint, unabhängig von dessen Autorisierungs-Policy. Als globale Middleware statt
/// als Erweiterung eines einzelnen Authorization-Handlers umgesetzt, da sie auch für Endpunkte
/// ohne <c>ProjectRole</c>-Policy (z. B. <c>SystemAdmin</c>-geschützte oder anonym erreichbare
/// Endpunkte) greifen muss.
/// <c>MustChangePassword</c> wird bewusst bei jedem Request frisch aus der Datenbank geladen (steht
/// nicht im JWT, siehe US-006 Akzeptanzkriterium 4) — eine erfolgreiche Passwortänderung wirkt so
/// ohne Re-Login sofort.
/// </summary>
public sealed class PasswordChangeRequiredMiddleware
{
    private const string ExemptPathPrefix = "/api/v1/auth";

    private readonly RequestDelegate _next;

    public PasswordChangeRequiredMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IUserRepository userRepository)
    {
        if (context.User.Identity?.IsAuthenticated == true &&
            !context.Request.Path.StartsWithSegments(ExemptPathPrefix))
        {
            var userIdClaim = context.User.FindFirst("sub")?.Value;
            if (Guid.TryParse(userIdClaim, out var userId))
            {
                var user = await userRepository.FindByIdAsync(userId, context.RequestAborted);
                if (user is not null && user.MustChangePassword)
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync(JsonSerializer.Serialize(new { error = "PASSWORD_CHANGE_REQUIRED" }));
                    return;
                }
            }
        }

        await _next(context);
    }
}
