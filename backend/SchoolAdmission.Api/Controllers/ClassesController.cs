using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("classes")]
public sealed class ClassesController(AdmissionDb db) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateClass(CreateClass request)
    {
        if (string.IsNullOrWhiteSpace(request.Name)
            || request.Name.Trim().Length > 160
            || request.TotalSeats < 1)
        {
            return BadRequest(new
            {
                error = "Enter a class name (max 160 characters) and positive seat count."
            });
        }

        var admissionClass = new AdmissionClass
        {
            Id = "c_" + Guid.NewGuid().ToString("N"),
            Name = request.Name.Trim(),
            TotalSeats = request.TotalSeats
        };
        db.Classes.Add(admissionClass);
        await db.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, new
        {
            admissionClass.Id,
            admissionClass.Name,
            admissionClass.TotalSeats
        });
    }

    [HttpGet]
    public async Task<IActionResult> ListClasses()
    {
        var now = DateTime.UtcNow;
        var classes = await db.Classes
            .OrderBy(item => item.Name)
            .Select(item => new
            {
                item.Id,
                item.Name,
                item.TotalSeats,
                HeldSeats = item.Holds.Count(hold => hold.Status == "HELD" && hold.ExpiresAt > now),
                ConfirmedSeats = item.Holds.Count(hold => hold.Status == "CONFIRMED")
            })
            .ToListAsync();

        return Ok(classes.Select(item => new
        {
            item.Id,
            item.Name,
            item.TotalSeats,
            item.HeldSeats,
            item.ConfirmedSeats,
            AvailableSeats = item.TotalSeats - item.HeldSeats - item.ConfirmedSeats
        }));
    }

    [HttpGet("{classId}")]
    public async Task<IActionResult> GetClass(string classId)
    {
        var now = DateTime.UtcNow;
        var admissionClass = await db.Classes
            .Where(item => item.Id == classId)
            .Select(item => new
            {
                item.Id,
                item.Name,
                item.TotalSeats,
                HeldSeats = item.Holds.Count(hold => hold.Status == "HELD" && hold.ExpiresAt > now),
                ConfirmedSeats = item.Holds.Count(hold => hold.Status == "CONFIRMED")
            })
            .FirstOrDefaultAsync();

        return admissionClass is null
            ? NotFound(new { error = "Class not found." })
            : Ok(new
            {
                admissionClass.Id,
                admissionClass.Name,
                admissionClass.TotalSeats,
                admissionClass.HeldSeats,
                admissionClass.ConfirmedSeats,
                AvailableSeats = admissionClass.TotalSeats
                    - admissionClass.HeldSeats
                    - admissionClass.ConfirmedSeats
            });
    }
}