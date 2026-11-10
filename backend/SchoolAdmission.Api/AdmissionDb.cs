using Microsoft.EntityFrameworkCore;

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