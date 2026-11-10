public class AdmissionClass
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public int TotalSeats { get; set; }
    public List<AdmissionHold> Holds { get; set; } = [];
}