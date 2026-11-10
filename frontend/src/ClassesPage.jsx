import { ArrowRight, BookOpen } from "lucide-react";

export default function ClassesPage({ classes, bn, onApply }) {
  return (
    <section>
      <div className="sectionhead">
        <div>
          <h2>সব ক্লাস ও শিফট</h2>
          <p>একই শ্রেণির সকাল ও দিনের শিফট আলাদা ক্লাস হিসেবে দেখানো হবে।</p>
        </div>
        <span className="counter">{bn(classes.length)}টি ক্লাস</span>
      </div>
      <div className="classgrid">
        {classes.map((classItem) => (
          <article className="classcard" key={classItem.id}>
            <div className="classicon">
              <BookOpen size={22} />
            </div>
            <h3>{classItem.name}</h3>
            <div className="classmeta">
              <span>মোট সিট</span>
              <b>{bn(classItem.totalSeats)}টি</b>
            </div>
            <div className="bar">
              <div
                style={{
                  width: `${classItem.totalSeats ? (100 * (classItem.heldSeats + classItem.confirmedSeats)) / classItem.totalSeats : 0}%`,
                }}
              />
            </div>
            <div className="seatbreakdown">
              <span>
                হোল্ডে: <b>{bn(classItem.heldSeats)}</b>
              </span>
              <span>
                নিশ্চিত: <b>{bn(classItem.confirmedSeats)}</b>
              </span>
              <span>
                খালি: <b>{bn(classItem.availableSeats)}</b>
              </span>
            </div>
            <button
              className="primary full"
              onClick={() => onApply(classItem.id)}
            >
              আবেদন করুন <ArrowRight size={17} />
            </button>
          </article>
        ))}
        {classes.length === 0 && (
          <div className="empty">
            এখনও কোনো ক্লাস তৈরি হয়নি। স্কুল অ্যাডমিন ক্লাস তৈরি করতে পারবেন।
          </div>
        )}
      </div>
    </section>
  );
}