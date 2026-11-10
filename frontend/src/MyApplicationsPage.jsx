export default function MyApplicationsPage({ holds, valid, bn, holdCard }) {
  return (
    <section>
      <div className="sectionhead">
        <div>
          <h2>শিক্ষার্থীর সব আবেদন</h2>
          <p>সংরক্ষিত, নিশ্চিত, বাতিল ও মেয়াদোত্তীর্ণ—সব আবেদনের অবস্থা।</p>
        </div>
        <span className="counter">{bn(holds.length)}টি আবেদন</span>
      </div>
      {!valid ? (
        <div className="empty">আবেদন দেখতে জন্ম নিবন্ধন নম্বর লিখুন।</div>
      ) : holds.length === 0 ? (
        <div className="empty">
          এই শিক্ষার্থীর কোনো আবেদন পাওয়া যায়নি। ক্লাস তালিকা থেকে আবেদন করুন।
        </div>
      ) : (
        <div className="applicationlist">{holds.map(holdCard)}</div>
      )}
    </section>
  );
}