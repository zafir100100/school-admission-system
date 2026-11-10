import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  GraduationCap,
  School,
  Users,
  Clock3,
  CheckCircle2,
  Plus,
  RefreshCw,
  ArrowRight,
  Trash2,
  AlertCircle,
  BookOpen,
  ClipboardList,
  CreditCard,
  ChevronLeft,
} from "lucide-react";
import "./style.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";
const statusText = {
  HELD: "সিট সংরক্ষিত",
  CONFIRMED: "ভর্তি নিশ্চিত",
  EXPIRED: "মেয়াদ শেষ",
  CANCELLED: "বাতিল",
};
const bn = (value) => Number(value || 0).toLocaleString("bn-BD");
const translateError = (message) => {
  if (/already have an active/i.test(message))
    return "এই ক্লাসে আপনার ইতিমধ্যে একটি সক্রিয় আবেদন রয়েছে।";
  if (/No seats available/i.test(message))
    return "এই ক্লাসে কোনো খালি সিট নেই।";
  if (/no longer active/i.test(message))
    return "আবেদনের সময়সীমা শেষ হয়েছে। নতুন করে আবেদন করুন।";
  if (/17 digits/i.test(message)) return "১৭ সংখ্যার জন্ম নিবন্ধন নম্বর লিখুন।";
  if (/Cannot connect|Failed to fetch/i.test(message))
    return "সার্ভারের সাথে সংযোগ করা যাচ্ছে না। Docker চালু আছে কি না দেখুন।";
  if (/class not found/i.test(message)) return "ক্লাসটি পাওয়া যায়নি।";
  if (/conflicting|conflict/i.test(message))
    return "একই সময়ে একাধিক অনুরোধ এসেছে। আবার চেষ্টা করুন।";
  return message || "অনুরোধটি সম্পন্ন হয়নি। আবার চেষ্টা করুন।";
};

function App() {
  const [student, setStudent] = useState(
    localStorage.getItem("studentId") || "",
  );
  const [tab, setTab] = useState("classes");
  const [selected, setSelected] = useState(null);
  const [classes, setClasses] = useState([]);
  const [holds, setHolds] = useState([]);
  const [name, setName] = useState("");
  const [seats, setSeats] = useState("30");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [now, setNow] = useState(Date.now());
  const valid = /^\d{17}$/.test(student);
  const request = useCallback(
    async (path, options = {}) => {
      let res;
      try {
        res = await fetch(API + path, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...(valid ? { "X-Student-Id": student } : {}),
            ...options.headers,
          },
        });
      } catch {
        throw Error("Cannot connect to the admission server.");
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw Error(data.error || `অনুরোধ ব্যর্থ হয়েছে (${res.status})`);
      }
      return res.status === 204 ? null : res.json();
    },
    [student, valid],
  );
  const refresh = useCallback(
    async (silent = false) => {
      try {
        const c = await request("/classes");
        setClasses(c);
        if (valid) {
          setHolds(await request("/me/holds"));
        } else {
          setHolds([]);
        }
      } catch (e) {
        if (!silent)
          setNotice({ type: "error", text: translateError(e.message) });
      }
    },
    [request, valid],
  );
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      refresh(true);
    }, 5000);
    return () => clearInterval(id);
  }, [refresh]);
  useEffect(() => {
    if (valid) localStorage.setItem("studentId", student);
    else localStorage.removeItem("studentId");
  }, [student, valid]);
  async function act(fn, success, nextTab) {
    setLoading(true);
    setNotice(null);
    try {
      await fn();
      await refresh();
      setNotice({ type: "success", text: success });
      if (nextTab) setTab(nextTab);
    } catch (e) {
      setNotice({ type: "error", text: translateError(e.message) });
    } finally {
      setLoading(false);
    }
  }
  const count = (key) => classes.reduce((sum, c) => sum + c[key], 0);
  const effective = (h) =>
    h.status === "HELD" && new Date(h.expiresAt).getTime() <= now
      ? "EXPIRED"
      : h.status;
  const remaining = (h) =>
    Math.max(0, Math.ceil((new Date(h.expiresAt).getTime() - now) / 1000));
  const clock = (s) => `${bn(Math.floor(s / 60))} মিনিট ${bn(s % 60)} সেকেন্ড`;
  const active = holds.filter((h) =>
    ["HELD", "CONFIRMED"].includes(effective(h)),
  );
  const chosen = classes.find((c) => c.id === selected);
  const chosenHold = chosen && active.find((h) => h.classId === chosen.id);
  const pages = {
    classes: [
      "ক্লাস তালিকা",
      "প্রতিটি ক্লাস ও শিফটের সিট সংখ্যা দেখে আবেদন করুন।",
    ],
    apply: [
      "ভর্তির আবেদন",
      "নির্বাচিত ক্লাসে সিট সংরক্ষণ করুন এবং নির্ধারিত সময়ের মধ্যে ভর্তি নিশ্চিত করুন।",
    ],
    mine: [
      "আমার আবেদন",
      "এই শিক্ষার্থীর সব আবেদন ও প্রতিটির বর্তমান অবস্থা দেখুন।",
    ],
    admin: [
      "ক্লাস তৈরি (স্কুল অ্যাডমিন)",
      "ক্লাস ও শিফটের নাম এবং সিট সংখ্যা দিয়ে নতুন ক্লাস তৈরি করুন।",
    ],
  };
  function openApply(id) {
    setSelected(id);
    setTab("apply");
    setNotice(null);
  }
  function holdCard(h) {
    const status = effective(h);
    return (
      <article className="application" key={h.holdId}>
        <div>
          <div className="appname">
            {h.className ||
              classes.find((c) => c.id === h.classId)?.name ||
              "ক্লাস"}
          </div>
          <div className="muted">আবেদন নম্বর: {h.holdId}</div>
          {status === "HELD" && (
            <div className="timer">
              <Clock3 size={16} /> সময় বাকি:{" "}
              <strong>{clock(remaining(h))}</strong>
            </div>
          )}
          {status === "EXPIRED" && <p>সিট সংরক্ষণের সময় শেষ হয়েছে।</p>}
        </div>
        <div className="actions">
          <span className={"status " + status.toLowerCase()}>
            {statusText[status] || status}
          </span>
          {status === "HELD" && (
            <>
              <button
                className="primary"
                disabled={loading}
                onClick={() =>
                  act(
                    () =>
                      request(`/holds/${h.holdId}/confirm`, { method: "POST" }),
                    "ভর্তি ফি সফলভাবে পরিশোধ হয়েছে। আপনার ভর্তি নিশ্চিত করা হয়েছে।",
                  )
                }
              >
                <CreditCard size={16} /> ভর্তি ফি দিন
              </button>
              <button
                className="danger"
                disabled={loading}
                onClick={() =>
                  act(
                    () => request(`/holds/${h.holdId}`, { method: "DELETE" }),
                    "আবেদন বাতিল হয়েছে। সিটটি আবার খালি হয়েছে।",
                  )
                }
              >
                <Trash2 size={16} /> বাতিল
              </button>
            </>
          )}
        </div>
      </article>
    );
  }
  return (
    <div className="shell" lang="bn">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandicon">
            <GraduationCap size={26} />
          </div>
          <div>
            <b>ভর্তি সেবা</b>
            <small>স্কুল ভর্তি ব্যবস্থাপনা</small>
          </div>
        </div>
        <div className="navlabel">শিক্ষার্থী সেবা</div>
        <button
          className={"nav " + (tab === "classes" ? "selected" : "")}
          onClick={() => setTab("classes")}
        >
          <BookOpen size={18} /> ক্লাস তালিকা
        </button>
        <button
          className={"nav " + (tab === "apply" ? "selected" : "")}
          onClick={() => setTab("apply")}
        >
          <ClipboardList size={18} /> আবেদন
        </button>
        <button
          className={"nav " + (tab === "mine" ? "selected" : "")}
          onClick={() => setTab("mine")}
        >
          <Users size={18} /> আমার আবেদন
        </button>
        <div className="navlabel adminlabel">স্কুল প্রশাসন</div>
        <button
          className={"nav " + (tab === "admin" ? "selected" : "")}
          onClick={() => setTab("admin")}
        >
          <School size={18} /> ক্লাস তৈরি
        </button>
        <div className="sidebarbottom">
          <div className="live">
            <span className="dot" /> ভর্তি আবেদন পোর্টাল
          </div>
          <small>শিক্ষাবর্ষ ২০২৬–২০২৭</small>
        </div>
      </aside>
      <main className="main">
        <header className="top">
          <div className="crumb">
            স্কুল ভর্তি <span>/</span> {pages[tab][0]}
          </div>
          <div className="student">
            <label htmlFor="student">শিক্ষার্থীর জন্ম নিবন্ধন নম্বর</label>
            <input
              id="student"
              inputMode="numeric"
              aria-invalid={student.length > 0 && !valid}
              value={student}
              onChange={(e) =>
                setStudent(e.target.value.replace(/[^0-9]/g, "").slice(0, 17))
              }
              placeholder="১৭ সংখ্যার জন্ম নিবন্ধন নম্বর"
              maxLength={17}
            />
          </div>
        </header>
        <div className="content">
          <div className="headline">
            <div>
              <div className="eyebrow">শিক্ষাবর্ষ ২০২৬–২০২৭</div>
              <h1>{pages[tab][0]}</h1>
              <p>{pages[tab][1]}</p>
            </div>
            <button className="secondary refresh" onClick={() => refresh()}>
              <RefreshCw size={16} /> হালনাগাদ করুন
            </button>
          </div>
          {notice && (
            <div role="alert" className={"notice " + notice.type}>
              {notice.type === "error" ? (
                <AlertCircle size={18} />
              ) : (
                <CheckCircle2 size={18} />
              )}
              <span>{notice.text}</span>
              <button
                aria-label="বার্তা বন্ধ করুন"
                onClick={() => setNotice(null)}
              >
                ×
              </button>
            </div>
          )}
          {!valid && tab !== "admin" && (
            <div className="hint">
              <AlertCircle size={19} /> আবেদন করতে বা নিজের আবেদন দেখতে উপরের
              ঘরে ১৭ সংখ্যার জন্ম নিবন্ধন নম্বর লিখুন। কোনো লগইন প্রয়োজন নেই।
            </div>
          )}
          <div className="stats">
            <div className="stat">
              <div className="statlabel">
                <School size={17} /> মোট সিট
              </div>
              <strong>{bn(count("totalSeats"))}</strong>
              <small>সব ক্লাস মিলিয়ে</small>
            </div>
            <div className="stat">
              <div className="statlabel">
                <CheckCircle2 size={17} /> খালি সিট
              </div>
              <strong>{bn(count("availableSeats"))}</strong>
              <small>আবেদনের জন্য উন্মুক্ত</small>
            </div>
            <div className="stat">
              <div className="statlabel">
                <Clock3 size={17} /> হোল্ডে থাকা সিট
              </div>
              <strong>{bn(count("heldSeats"))}</strong>
              <small>নিশ্চিতকরণের অপেক্ষায়</small>
            </div>
            <div className="stat">
              <div className="statlabel">
                <Users size={17} /> নিশ্চিত ভর্তি
              </div>
              <strong>{bn(count("confirmedSeats"))}</strong>
              <small>ভর্তি সম্পন্ন</small>
            </div>
          </div>
          {tab === "classes" && (
            <section>
              <div className="sectionhead">
                <div>
                  <h2>সব ক্লাস ও শিফট</h2>
                  <p>
                    একই শ্রেণির সকাল ও দিনের শিফট আলাদা ক্লাস হিসেবে দেখানো হবে।
                  </p>
                </div>
                <span className="counter">{bn(classes.length)}টি ক্লাস</span>
              </div>
              <div className="classgrid">
                {classes.map((c) => (
                  <article className="classcard" key={c.id}>
                    <div className="classicon">
                      <BookOpen size={22} />
                    </div>
                    <h3>{c.name}</h3>
                    <div className="classmeta">
                      <span>মোট সিট</span>
                      <b>{bn(c.totalSeats)}টি</b>
                    </div>
                    <div className="bar">
                      <div
                        style={{
                          width: `${c.totalSeats ? (100 * (c.heldSeats + c.confirmedSeats)) / c.totalSeats : 0}%`,
                        }}
                      />
                    </div>
                    <div className="seatbreakdown">
                      <span>
                        হোল্ডে: <b>{bn(c.heldSeats)}</b>
                      </span>
                      <span>
                        নিশ্চিত: <b>{bn(c.confirmedSeats)}</b>
                      </span>
                      <span>
                        খালি: <b>{bn(c.availableSeats)}</b>
                      </span>
                    </div>
                    <button
                      className="primary full"
                      onClick={() => openApply(c.id)}
                    >
                      আবেদন করুন <ArrowRight size={17} />
                    </button>
                  </article>
                ))}
                {classes.length === 0 && (
                  <div className="empty">
                    এখনও কোনো ক্লাস তৈরি হয়নি। স্কুল অ্যাডমিন ক্লাস তৈরি করতে
                    পারবেন।
                  </div>
                )}
              </div>
            </section>
          )}
          {tab === "apply" && (
            <section>
              <div className="sectionhead">
                <div>
                  <h2>আবেদন</h2>
                  <p>প্রথমে ক্লাস নির্বাচন করুন, তারপর সিট সংরক্ষণ করুন।</p>
                </div>
              </div>
              <div className="applypanel">
                <div className="field">
                  <label htmlFor="class-select">
                    ক্লাস ও শিফট নির্বাচন করুন
                  </label>
                  <select
                    id="class-select"
                    value={selected || ""}
                    onChange={(e) => setSelected(e.target.value || null)}
                  >
                    <option value="">একটি ক্লাস নির্বাচন করুন</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
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
                          এই ক্লাসে আপনার ইতিমধ্যে একটি আবেদন আছে। নিচে তার
                          অবস্থা দেখুন।
                        </div>
                        {holdCard(chosenHold)}
                      </>
                    ) : (
                      <button
                        className="primary"
                        disabled={
                          !valid || loading || chosen.availableSeats <= 0
                        }
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
                    {valid &&
                      holds.filter(
                        (h) =>
                          h.classId === chosen.id &&
                          !["HELD", "CONFIRMED"].includes(effective(h)),
                      ).length > 0 && (
                        <div className="pastapplications">
                          <h3>আগের আবেদন</h3>
                          {holds
                            .filter(
                              (h) =>
                                h.classId === chosen.id &&
                                !["HELD", "CONFIRMED"].includes(effective(h)),
                            )
                            .map(holdCard)}
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
                “ভর্তি ফি দিন” চাপলে সফল পেমেন্ট ধরে নেওয়া হবে। কোনো আসল টাকা
                কাটা হবে না।
              </p>
            </section>
          )}
          {tab === "mine" && (
            <section>
              <div className="sectionhead">
                <div>
                  <h2>শিক্ষার্থীর সব আবেদন</h2>
                  <p>
                    সংরক্ষিত, নিশ্চিত, বাতিল ও মেয়াদোত্তীর্ণ—সব আবেদনের অবস্থা।
                  </p>
                </div>
                <span className="counter">{bn(holds.length)}টি আবেদন</span>
              </div>
              {!valid ? (
                <div className="empty">
                  আবেদন দেখতে জন্ম নিবন্ধন নম্বর লিখুন।
                </div>
              ) : holds.length === 0 ? (
                <div className="empty">
                  এই শিক্ষার্থীর কোনো আবেদন পাওয়া যায়নি। ক্লাস তালিকা থেকে আবেদন
                  করুন।
                </div>
              ) : (
                <div className="applicationlist">{holds.map(holdCard)}</div>
              )}
            </section>
          )}
          {tab === "admin" && (
            <section>
              <div className="sectionhead">
                <div>
                  <h2>নতুন ক্লাস তৈরি</h2>
                  <p>
                    প্রতিটি শিফট আলাদা নামে তৈরি করুন। যেমন: “ষষ্ঠ শ্রেণি – সকাল
                    শিফট” ও “ষষ্ঠ শ্রেণি – দিবা শিফট”।
                  </p>
                </div>
              </div>
              <form
                className="createform"
                onSubmit={(e) => {
                  e.preventDefault();
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
                    onChange={(e) => setName(e.target.value)}
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
                    onChange={(e) => setSeats(e.target.value)}
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
                    {classes.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <b>{c.name}</b>
                        </td>
                        <td>{bn(c.totalSeats)}</td>
                        <td>{bn(c.heldSeats)}</td>
                        <td>{bn(c.confirmedSeats)}</td>
                        <td>
                          <span className="available">
                            {bn(c.availableSeats)}
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
          )}
          <footer>
            স্কুল ভর্তি ব্যবস্থাপনা · আগে এলে আগে সিট · কোনো লগইন প্রয়োজন নেই
          </footer>
        </div>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
