using System.Text.Json;
using Microsoft.EntityFrameworkCore;

public static class AdmissionRules
{
    public static string EffectiveStatus(AdmissionHold hold) =>
        hold.Status == "HELD" && hold.ExpiresAt <= DateTime.UtcNow
            ? "EXPIRED"
            : hold.Status;

    public static bool TryGetStudentId(HttpContext context, out string? id)
    {
        id = context.Request.Headers["X-Student-Id"].ToString();
        return id.Length == 17 && id.All(char.IsAsciiDigit);
    }
}

public static class AdmissionApiSupport
{
    public static WebApplication UseAdmissionErrorHandling(this WebApplication app)
    {
        app.Use(async (context, next) =>
        {
            try
            {
                await next();
            }
            catch (DbUpdateException)
            {
                await WriteError(context, 409, "Conflicting record; please retry.");
            }
            catch (Exception exception)
            {
                app.Logger.LogError(exception, "Request failed");
                if (!context.Response.HasStarted)
                    await WriteError(context, 500, "Unexpected server error.");
            }
        });
        return app;
    }

    public static async Task InitializeAdmissionDatabaseAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AdmissionDb>();
        for (var attempt = 0; attempt < 30; attempt++)
        {
            try
            {
                await db.Database.EnsureCreatedAsync();
                return;
            }
            catch (Exception) when (attempt < 29)
            {
                await Task.Delay(2000);
            }
        }
    }

    private static async Task WriteError(HttpContext context, int status, string message)
    {
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new { error = message }));
    }
}