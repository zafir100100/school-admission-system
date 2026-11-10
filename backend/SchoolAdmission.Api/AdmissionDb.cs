using Microsoft.EntityFrameworkCore;

public record CreateClass(string Name, int TotalSeats);

public class AdmissionClass
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public int TotalSeats { get; set; }
    public List<AdmissionHold> Holds { get; set; } = [];
}

public class AdmissionHold
{
    public string Id { get; set; } = "";
    public string ClassId { get; set; } = "";
    public AdmissionClass? Class { get; set; }
    public string StudentId { get; set; } = "";
    public string Status { get; set; } = "HELD";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
}

public class AdmissionDb(DbContextOptions<AdmissionDb> options) : DbContext(options)
{
    public DbSet<AdmissionClass> Classes => Set<AdmissionClass>();
    public DbSet<AdmissionHold> Holds => Set<AdmissionHold>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AdmissionClass>().ToTable("admission_classes").HasKey(x => x.Id);
        modelBuilder.Entity<AdmissionHold>().ToTable("admission_holds").HasKey(x => x.Id);
        modelBuilder.Entity<AdmissionHold>()
            .HasOne(x => x.Class)
            .WithMany(x => x.Holds)
            .HasForeignKey(x => x.ClassId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<AdmissionHold>().HasIndex(x => new { x.ClassId, x.Status, x.ExpiresAt });
        modelBuilder.Entity<AdmissionHold>().HasIndex(x => new { x.StudentId, x.ClassId });
    }
}