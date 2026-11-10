import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  GraduationCap,
  School,
  Users,
  Clock3,
  CheckCircle2,
  RefreshCw,
  Trash2,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import ClassesPage from "./ClassesPage.jsx";
import ApplyPage from "./ApplyPage.jsx";
import MyApplicationsPage from "./MyApplicationsPage.jsx";
import AdminPage from "./AdminPage.jsx";
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
            <ClassesPage classes={classes} bn={bn} onApply={openApply} />
          )}
          {tab === "apply" && (
            <ApplyPage
              classes={classes}
              selected={selected}
              setSelected={setSelected}
              chosen={chosen}
              chosenHold={chosenHold}
              valid={valid}
              loading={loading}
              act={act}
              request={request}
              holds={holds}
              effective={effective}
              holdCard={holdCard}
              bn={bn}
            />
          )}
          {tab === "mine" && (
            <MyApplicationsPage
              holds={holds}
              valid={valid}
              bn={bn}
              holdCard={holdCard}
            />
          )}
          {tab === "admin" && (
            <AdminPage
              classes={classes}
              bn={bn}
              name={name}
              setName={setName}
              seats={seats}
              setSeats={setSeats}
              loading={loading}
              act={act}
              request={request}
            />
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
