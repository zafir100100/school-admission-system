import { ArrowRight } from "lucide-react";

export default function ApplyPage({
  classes,
  selected,
  setSelected,
  chosen,
  chosenHold,
  valid,
  loading,
  act,
  request,
  holds,
  effective,
  holdCard,
  bn,
}) {
  const pastApplications = holds.filter(
    (hold) =>
      hold.classId === chosen?.id &&
      !["HELD", "CONFIRMED"].includes(effective(hold)),
  );

  return (
    <section>
      <div className="sectionhead">
        <div>
          <h2>আবেদন</h2>
          <p>প্রথমে ক্লাস নির্বাচন করুন, তারপর সিট সংরক্ষণ করুন।</p>
        </div>
      </div>
      <div className="applypanel">
        <div className="field">
          <label htmlFor="class-select">ক্লাস ও শিফট নির্বাচন করুন</label>
          <select
            id="class-select"
            value={selected || ""}
            onChange={(event) => setSelected(event.target.value || null)}
          >
            <option value="">একটি ক্লাস নির্বাচন করুন</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
        </div>
        {chosen ? (
          <>
            <div className="chosenclass">
              <h3>{chosen.name}</h3>
              <div className="seatbreakdown">
                <span>
                  মোট সিট: <b>{bn(chosen.totalSeats)}</b>
                </span>
                <span>
                  হোল্ডে: <b>{bn(chosen.heldSeats)}</b>
                </span>
                <span>
                  নিশ্চিত: <b>{bn(chosen.confirmedSeats)}</b>
                </span>
                <span>
                  খালি: <b>{bn(chosen.availableSeats)}</b>
                </span>
              </div>
            </div>
            {chosenHold ? (
              <>
                <div className="hint">
                  এই ক্লাসে আপনার ইতিমধ্যে একটি আবেদন আছে। নিচে তার অবস্থা দেখুন।
                </div>
                {holdCard(chosenHold)}
              </>
            ) : (
              <button
                className="primary"
                disabled={!valid || loading || chosen.availableSeats <= 0}
                onClick={() =>
                  act(
                    () =>
                      request(`/classes/${chosen.id}/holds`, {
                        method: "POST",
                      }),
                    "সিট সাময়িকভাবে সংরক্ষিত হয়েছে। মেয়াদ শেষ হওয়ার আগে ভর্তি ফি দিন।",
                  )
                }
              >
                {chosen.availableSeats <= 0
                  ? "কোনো খালি সিট নেই"
                  : "সিট সংরক্ষণ করে আবেদন করুন"}{" "}
                <ArrowRight size={16} />
              </button>
            )}
            {valid && pastApplications.length > 0 && (
              <div className="pastapplications">
                <h3>আগের আবেদন</h3>
                {pastApplications.map(holdCard)}
              </div>
            )}
          </>
        ) : (
          <div className="empty">
            আবেদন করতে উপরের তালিকা থেকে একটি ক্লাস নির্বাচন করুন।
          </div>
        )}
      </div>
      <p className="feeinfo">
        “ভর্তি ফি দিন” চাপলে সফল পেমেন্ট ধরে নেওয়া হবে। কোনো আসল টাকা কাটা হবে না।
      </p>
    </section>
  );
}