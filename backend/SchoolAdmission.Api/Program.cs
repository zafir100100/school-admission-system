using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<AdmissionDb>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(
                builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
                    ?? ["http://localhost:3000"])
            .AllowAnyHeader()
            .AllowAnyMethod()));
builder.Services.AddControllers();

var app = builder.Build();
app.UseCors();
app.UseAdmissionErrorHandling();
await app.InitializeAdmissionDatabaseAsync();

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.Run();

public partial class Program { }