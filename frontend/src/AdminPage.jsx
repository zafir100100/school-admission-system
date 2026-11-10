import { Plus } from "lucide-react";

export default function AdminPage({
  classes,
  bn,
  name,
  setName,
  seats,
  setSeats,
  loading,
  act,
  request,
}) {
  return (
    <section>
      <div className="sectionhead">
        <div>
          <h2>নতুন ক্লাস তৈরি</h2>
          <p>
            প্রতিটি শিফট আলাদা নামে তৈরি করুন। যেমন: “ষষ্ঠ শ্রেণি – সকাল শিফট” ও
            “ষষ্ঠ শ্রেণি – দিবা শিফট”।
          </p>
        </div>
      </div>
      <form
        className="createform"
        onSubmit={(event) => {
          event.preventDefault();
          act(async () => {
            await request("/classes", {
              method: "POST",
              body: JSON.stringify({
                name: name.trim(),
                totalSeats: Number(seats),
              }),
            });
            setName("");
          }, "নতুন ক্লাস সফলভাবে তৈরি হয়েছে।");
        }}
      >
        <div className="field">
          <label htmlFor="class-name">ক্লাস ও শিফটের নাম</label>
          <input
            id="class-name"
            required
            maxLength={160}
            placeholder="যেমন: ষষ্ঠ শ্রেণি – সকাল শিফট"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="class-seats">মোট সিট সংখ্যা</label>
          <input
            id="class-seats"
            required
            type="number"
            min="1"
            max="1000000"
            value={seats}
            onChange={(event) => setSeats(event.target.value)}
          />
        </div>
        <button className="primary" disabled={loading || !name.trim()}>
          <Plus size={17} /> ক্লাস তৈরি করুন
        </button>
      </form>
      <div className="sectionhead">
        <div>
          <h2>তৈরি করা ক্লাসসমূহ</h2>
          <p>প্রতিটি ক্লাসের বর্তমান সিটের হিসাব।</p>
        </div>
      </div>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>ক্লাস ও শিফট</th>
              <th>মোট সিট</th>
              <th>হোল্ডে</th>
              <th>নিশ্চিত</th>
              <th>খালি</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((classItem) => (
              <tr key={classItem.id}>
                <td>
                  <b>{classItem.name}</b>
                </td>
                <td>{bn(classItem.totalSeats)}</td>
                <td>{bn(classItem.heldSeats)}</td>
                <td>{bn(classItem.confirmedSeats)}</td>
                <td>
                  <span className="available">
                    {bn(classItem.availableSeats)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {classes.length === 0 && (
          <div className="empty">এখনও কোনো ক্লাস তৈরি হয়নি।</div>
        )}
      </div>
    </section>
  );
}