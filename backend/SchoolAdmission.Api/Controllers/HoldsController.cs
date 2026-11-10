using System.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
public sealed class HoldsController(AdmissionDb db, IConfiguration configuration) : ControllerBase
{
    [HttpPost("/classes/{classId}/holds")]
    public async Task<IActionResult> CreateHold(string classId)
    {
        if (!AdmissionRules.TryGetStudentId(HttpContext, out var student))
            return BadRequest(new { error = "X-Student-Id must contain exactly 17 digits." });

        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted);
        var admissionClass = (await db.Classes
            .FromSqlInterpolated($"SELECT * FROM admission_classes WHERE \"Id\" = {classId} FOR UPDATE")
            .ToListAsync())
            .FirstOrDefault();
        if (admissionClass is null)
            return NotFound(new { error = "Class not found." });

        var now = DateTime.UtcNow;
        var existing = await db.Holds.AnyAsync(hold =>
            hold.ClassId == classId
            && hold.StudentId == student
            && (hold.Status == "CONFIRMED" || (hold.Status == "HELD" && hold.ExpiresAt > now)));
        if (existing)
            return Conflict(new { error = "You already have an active or confirmed application for this class." });

        var occupied = await db.Holds.CountAsync(hold =>
            hold.ClassId == classId
            && (hold.Status == "CONFIRMED" || (hold.Status == "HELD" && hold.ExpiresAt > now)));
        if (occupied >= admissionClass.TotalSeats)
            return Conflict(new { error = "No seats available." });

        var duration = int.TryParse(configuration["HOLD_DURATION_SECONDS"], out var seconds) && seconds > 0
            ? seconds
            : 600;
        var hold = new AdmissionHold
        {
            Id = "h_" + Guid.NewGuid().ToString("N"),
            ClassId = classId,
            StudentId = student!,
            Status = "HELD",
            ExpiresAt = now.AddSeconds(duration)
        };
        db.Holds.Add(hold);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        return StatusCode(StatusCodes.Status201Created, new
        {
            HoldId = hold.Id,
            hold.ClassId,
            hold.StudentId,
            hold.Status,
            hold.ExpiresAt
        });
    }

    [HttpGet("/holds/{holdId}")]
    public async Task<IActionResult> GetHold(string holdId)
    {
        var hold = await db.Holds.AsNoTracking().FirstOrDefaultAsync(item => item.Id == holdId);
        if (hold is null)
            return NotFound(new { error = "Application not found." });

        return Ok(new
        {
            HoldId = hold.Id,
            hold.ClassId,
            Status = AdmissionRules.EffectiveStatus(hold),
            hold.ExpiresAt
        });
    }

    [HttpPost("/holds/{holdId}/confirm")]
    public async Task<IActionResult> ConfirmHold(string holdId)
    {
        if (!AdmissionRules.TryGetStudentId(HttpContext, out var student))
            return BadRequest(new { error = "X-Student-Id must contain exactly 17 digits." });

        var classId = await db.Holds
            .Where(hold => hold.Id == holdId)
            .Select(hold => hold.ClassId)
            .FirstOrDefaultAsync();
        if (classId is null)
            return NotFound(new { error = "Application not found." });

        await using var transaction = await db.Database.BeginTransactionAsync();
        await db.Classes
            .FromSqlInterpolated($"SELECT * FROM admission_classes WHERE \"Id\" = {classId} FOR UPDATE")
            .ToListAsync();
        var hold = await db.Holds.FirstAsync(item => item.Id == holdId);
        if (hold.StudentId != student)
            return StatusCode(StatusCodes.Status403Forbidden);
        if (hold.Status == "CONFIRMED")
            return Ok(new { HoldId = hold.Id, Status = hold.Status });
        if (hold.Status != "HELD" || hold.ExpiresAt <= DateTime.UtcNow)
            return Conflict(new { error = "Application is no longer active." });

        hold.Status = "CONFIRMED";
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return Ok(new { HoldId = hold.Id, Status = hold.Status });
    }

    [HttpDelete("/holds/{holdId}")]
    public async Task<IActionResult> CancelHold(string holdId)
    {
        if (!AdmissionRules.TryGetStudentId(HttpContext, out var student))
            return BadRequest(new { error = "X-Student-Id must contain exactly 17 digits." });

        var classId = await db.Holds
            .Where(hold => hold.Id == holdId)
            .Select(hold => hold.ClassId)
            .FirstOrDefaultAsync();
        if (classId is null)
            return NotFound(new { error = "Application not found." });

        await using var transaction = await db.Database.BeginTransactionAsync();
        await db.Classes
            .FromSqlInterpolated($"SELECT * FROM admission_classes WHERE \"Id\" = {classId} FOR UPDATE")
            .ToListAsync();
        var hold = await db.Holds.FirstAsync(item => item.Id == holdId);
        if (hold.StudentId != student)
            return StatusCode(StatusCodes.Status403Forbidden);
        if (hold.Status == "CONFIRMED")
            return Conflict(new { error = "Confirmed admission cannot be cancelled." });
        if (hold.Status == "HELD")
            hold.Status = "CANCELLED";

        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return NoContent();
    }

    [HttpGet("/me/holds")]
    public async Task<IActionResult> GetStudentHolds()
    {
        if (!AdmissionRules.TryGetStudentId(HttpContext, out var student))
            return BadRequest(new { error = "X-Student-Id must contain exactly 17 digits." });

        var holds = await db.Holds
            .AsNoTracking()
            .Where(hold => hold.StudentId == student)
            .Include(hold => hold.Class)
            .OrderByDescending(hold => hold.CreatedAt)
            .ToListAsync();

        return Ok(holds.Select(hold => new
        {
            HoldId = hold.Id,
            hold.ClassId,
            ClassName = hold.Class!.Name,
            Status = AdmissionRules.EffectiveStatus(hold),
            hold.ExpiresAt
        }));
    }
}