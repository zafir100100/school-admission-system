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