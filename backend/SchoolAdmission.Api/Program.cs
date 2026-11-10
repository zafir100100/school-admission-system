using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using System.Data;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<AdmissionDb>(o => o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:3000"]).AllowAnyHeader().AllowAnyMethod()));
var app = builder.Build();
app.UseCors();
app.Use(async (ctx, next) => { try { await next(); } catch (DbUpdateException) { await Error(ctx, 409, "Conflicting record; please retry."); } catch (Exception ex) { app.Logger.LogError(ex, "Request failed"); if (!ctx.Response.HasStarted) await Error(ctx, 500, "Unexpected server error."); } });
await Initialize(app);

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapPost("/classes", async (CreateClass req, AdmissionDb db) =>
{
    if (string.IsNullOrWhiteSpace(req.Name) || req.Name.Trim().Length > 160 || req.TotalSeats < 1) return Results.BadRequest(new { error = "Enter a class name (max 160 characters) and positive seat count." });
    var c = new AdmissionClass { Id = "c_" + Guid.NewGuid().ToString("N"), Name = req.Name.Trim(), TotalSeats = req.TotalSeats };
    db.Classes.Add(c); await db.SaveChangesAsync();
    return Results.Json(new { c.Id, c.Name, c.TotalSeats }, statusCode: 201);
});
app.MapGet("/classes", async (AdmissionDb db) =>
{
    var now = DateTime.UtcNow;
    var classes = await db.Classes.OrderBy(x => x.Name).Select(c => new
    {
        c.Id,
        c.Name,
        c.TotalSeats,
        HeldSeats = c.Holds.Count(h => h.Status == "HELD" && h.ExpiresAt > now),
        ConfirmedSeats = c.Holds.Count(h => h.Status == "CONFIRMED")
    }).ToListAsync();
    return Results.Ok(classes.Select(c => new { c.Id, c.Name, c.TotalSeats, c.HeldSeats, c.ConfirmedSeats, AvailableSeats = c.TotalSeats - c.HeldSeats - c.ConfirmedSeats }));
});
app.MapGet("/classes/{classId}", async (string classId, AdmissionDb db) =>
{
    var now = DateTime.UtcNow;
    var c = await db.Classes.Where(x => x.Id == classId).Select(c => new { c.Id, c.Name, c.TotalSeats, HeldSeats = c.Holds.Count(h => h.Status == "HELD" && h.ExpiresAt > now), ConfirmedSeats = c.Holds.Count(h => h.Status == "CONFIRMED") }).FirstOrDefaultAsync();
    return c is null ? Results.NotFound(new { error = "Class not found." }) : Results.Ok(new { c.Id, c.Name, c.TotalSeats, c.HeldSeats, c.ConfirmedSeats, AvailableSeats = c.TotalSeats - c.HeldSeats - c.ConfirmedSeats });
});
app.MapPost("/classes/{classId}/holds", async (string classId, HttpContext ctx, AdmissionDb db, IConfiguration config) =>
{
    if (!Student(ctx, out var student)) return Results.BadRequest(new { error = "X-Student-Id must contain exactly 17 digits." });
    await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted);
    // PostgreSQL row lock serializes seat allocation for this class across all API processes.
    var c = (await db.Classes.FromSqlInterpolated($"SELECT * FROM admission_classes WHERE \"Id\" = {classId} FOR UPDATE").ToListAsync()).FirstOrDefault();
    if (c is null) return Results.NotFound(new { error = "Class not found." });
    var now = DateTime.UtcNow;
    var existing = await db.Holds.AnyAsync(h => h.ClassId == classId && h.StudentId == student && (h.Status == "CONFIRMED" || (h.Status == "HELD" && h.ExpiresAt > now)));
    if (existing) return Results.Conflict(new { error = "You already have an active or confirmed application for this class." });
    var occupied = await db.Holds.CountAsync(h => h.ClassId == classId && (h.Status == "CONFIRMED" || (h.Status == "HELD" && h.ExpiresAt > now)));
    if (occupied >= c.TotalSeats) return Results.Conflict(new { error = "No seats available." });
    var duration = int.TryParse(config["HOLD_DURATION_SECONDS"], out var seconds) && seconds > 0 ? seconds : 600;
    var h = new AdmissionHold { Id = "h_" + Guid.NewGuid().ToString("N"), ClassId = classId, StudentId = student!, Status = "HELD", ExpiresAt = now.AddSeconds(duration) };
    db.Holds.Add(h); await db.SaveChangesAsync(); await tx.CommitAsync();
    return Results.Json(new { HoldId = h.Id, h.ClassId, h.StudentId, h.Status, h.ExpiresAt }, statusCode: 201);
});
app.MapGet("/holds/{holdId}", async (string holdId, AdmissionDb db) =>
{
    var h = await db.Holds.AsNoTracking().FirstOrDefaultAsync(x => x.Id == holdId);
    if (h is null) return Results.NotFound(new { error = "Application not found." });
    return Results.Ok(new { HoldId = h.Id, h.ClassId, Status = Effective(h), h.ExpiresAt });
});
app.MapPost("/holds/{holdId}/confirm", async (string holdId, HttpContext ctx, AdmissionDb db) =>
{
    if (!Student(ctx, out var student)) return Results.BadRequest(new { error = "X-Student-Id must contain exactly 17 digits." });
    // Class lock is acquired first in all mutations to prevent deadlocks.
    var classId = await db.Holds.Where(h => h.Id == holdId).Select(h => h.ClassId).FirstOrDefaultAsync();
    if (classId is null) return Results.NotFound(new { error = "Application not found." });
    await using var tx = await db.Database.BeginTransactionAsync();
    await db.Classes.FromSqlInterpolated($"SELECT * FROM admission_classes WHERE \"Id\" = {classId} FOR UPDATE").ToListAsync();
    var h = await db.Holds.FirstAsync(x => x.Id == holdId);
    if (h.StudentId != student) return Results.StatusCode(403);
    if (h.Status == "CONFIRMED") return Results.Ok(new { HoldId = h.Id, Status = h.Status });
    if (h.Status != "HELD" || h.ExpiresAt <= DateTime.UtcNow) return Results.Conflict(new { error = "Application is no longer active." });
    h.Status = "CONFIRMED"; await db.SaveChangesAsync(); await tx.CommitAsync();
    return Results.Ok(new { HoldId = h.Id, Status = h.Status });
});
app.MapDelete("/holds/{holdId}", async (string holdId, HttpContext ctx, AdmissionDb db) =>
{
    if (!Student(ctx, out var student)) return Results.BadRequest(new { error = "X-Student-Id must contain exactly 17 digits." });
    var classId = await db.Holds.Where(h => h.Id == holdId).Select(h => h.ClassId).FirstOrDefaultAsync();
    if (classId is null) return Results.NotFound(new { error = "Application not found." });
    await using var tx = await db.Database.BeginTransactionAsync();
    await db.Classes.FromSqlInterpolated($"SELECT * FROM admission_classes WHERE \"Id\" = {classId} FOR UPDATE").ToListAsync();
    var h = await db.Holds.FirstAsync(x => x.Id == holdId);
    if (h.StudentId != student) return Results.StatusCode(403);
    if (h.Status == "CONFIRMED") return Results.Conflict(new { error = "Confirmed admission cannot be cancelled." });
    if (h.Status == "HELD") h.Status = "CANCELLED";
    await db.SaveChangesAsync(); await tx.CommitAsync(); return Results.NoContent();
});
app.MapGet("/me/holds", async (HttpContext ctx, AdmissionDb db) =>
{
    if (!Student(ctx, out var student)) return Results.BadRequest(new { error = "X-Student-Id must contain exactly 17 digits." });
    var holds = await db.Holds.AsNoTracking().Where(h => h.StudentId == student).Include(h => h.Class).OrderByDescending(h => h.CreatedAt).ToListAsync();
    return Results.Ok(holds.Select(h => new { HoldId = h.Id, h.ClassId, ClassName = h.Class!.Name, Status = Effective(h), h.ExpiresAt }));
});
app.Run();

static string Effective(AdmissionHold h) => h.Status == "HELD" && h.ExpiresAt <= DateTime.UtcNow ? "EXPIRED" : h.Status;
static bool Student(HttpContext ctx, out string? id) { id = ctx.Request.Headers["X-Student-Id"].ToString(); return id.Length == 17 && id.All(char.IsAsciiDigit); }
static async Task Error(HttpContext ctx, int status, string message) { ctx.Response.StatusCode = status; ctx.Response.ContentType = "application/json"; await ctx.Response.WriteAsync(JsonSerializer.Serialize(new { error = message })); }
static async Task Initialize(WebApplication app)
{
    using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<AdmissionDb>();
    for (var i = 0; i < 30; i++) { try { await db.Database.EnsureCreatedAsync(); return; } catch (Exception) when (i < 29) { await Task.Delay(2000); } }
}
public record CreateClass(string Name, int TotalSeats);
public class AdmissionClass { public string Id { get; set; } = ""; public string Name { get; set; } = ""; public int TotalSeats { get; set; } public List<AdmissionHold> Holds { get; set; } = []; }
public class AdmissionHold { public string Id { get; set; } = ""; public string ClassId { get; set; } = ""; public AdmissionClass? Class { get; set; } public string StudentId { get; set; } = ""; public string Status { get; set; } = "HELD"; public DateTime CreatedAt { get; set; } = DateTime.UtcNow; public DateTime ExpiresAt { get; set; } }
public class AdmissionDb(DbContextOptions<AdmissionDb> options) : DbContext(options)
{
    public DbSet<AdmissionClass> Classes => Set<AdmissionClass>(); public DbSet<AdmissionHold> Holds => Set<AdmissionHold>();
    protected override void OnModelCreating(ModelBuilder m)
    {
        m.Entity<AdmissionClass>().ToTable("admission_classes").HasKey(x => x.Id);
        m.Entity<AdmissionHold>().ToTable("admission_holds").HasKey(x => x.Id);
        m.Entity<AdmissionHold>().HasOne(x => x.Class).WithMany(x => x.Holds).HasForeignKey(x => x.ClassId).OnDelete(DeleteBehavior.Restrict);
        m.Entity<AdmissionHold>().HasIndex(x => new { x.ClassId, x.Status, x.ExpiresAt });
        m.Entity<AdmissionHold>().HasIndex(x => new { x.StudentId, x.ClassId });
    }
}
public partial class Program { }
