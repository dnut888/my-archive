import React, { useMemo, useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { createClient } from "@supabase/supabase-js";

// ⚠️ 본인의 Supabase Key를 입력해주세요.
const SUPABASE_URL = "https://dctinbgpmxsfyexnfvbi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdGluYmdwbXhzZnlleG5mdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDU4NDQsImV4cCI6MjA4NDU4MTg0NH0.SPiNc-q-u6xHlb5H82EFvl8xBUmzuCIs8w6WS9tauyY";

let supabase: any = null;
try {
  if (SUPABASE_KEY && SUPABASE_KEY !== "여기에_본인의_ANON_KEY_입력") {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
} catch (e) { console.error(e); }

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [mode, setMode] = useState<"write" | "archive" | "style">("write");
  
  // 입력 상태
  const [work, setWork] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [character, setCharacter] = useState("");
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  // 디자인 상태
  const [bgColor, setBgColor] = useState("#f5f5f2");
  const [lineSize, setLineSize] = useState(16);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 1. 초기 데이터 로드 (로컬 -> DB 순서로 안전하게)
  useEffect(() => {
    // 일단 로컬에 저장된 게 있다면 먼저 보여줌 (오프라인/에러 방지)
    const localData = localStorage.getItem("my_archive_data");
    if (localData) setEntries(JSON.parse(localData));

    if (supabase) {
      supabase.auth.getSession().then(({ data }: any) => {
        setUser(data.session?.user ?? null);
        if (data.session?.user) fetchFromDB();
      });
    }
  }, []);

  const fetchFromDB = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("entries").select("*");
    if (data) {
      const dbEntries = data.map((d: any) => ({ ...d.content, db_id: d.id }));
      setEntries(dbEntries);
      localStorage.setItem("my_archive_data", JSON.stringify(dbEntries));
    }
  };

  // 2. 가장 중요한 [저장] 기능 - 로컬에 먼저 박고 DB로 보냄
  const save = async () => {
    if (!work || !text) return alert("내용을 입력해주세요.");

    const newEntry = {
      id: editingId || Date.now(),
      work, date, time, character, text,
      favorite: editingId ? (entries.find(e => e.id === editingId)?.favorite || false) : false
    };

    // [Step 1] 일단 내 브라우저(로컬)에 즉시 저장 (절대 안 날아감)
    let updatedEntries;
    if (editingId) {
      updatedEntries = entries.map(e => e.id === editingId ? newEntry : e);
    } else {
      updatedEntries = [newEntry, ...entries];
    }
    setEntries(updatedEntries);
    localStorage.setItem("my_archive_data", JSON.stringify(updatedEntries));

    // [Step 2] 로그인 상태라면 DB에 동기화
    if (supabase && user) {
      if (editingId) {
        const target = entries.find(e => e.id === editingId);
        await supabase.from("entries").update({ content: newEntry }).eq('id', target.db_id);
      } else {
        await supabase.from("entries").insert([{ content: newEntry, user_id: user.id }]);
      }
      fetchFromDB(); // DB와 싱크 맞춤
    }

    // 초기화
    setWork(""); setDate(""); setTime(""); setCharacter(""); setText("");
    setEditingId(null);
    setMode("archive");
  };

  const handleLogin = async () => {
    if (!supabase) return alert("Key를 입력해주세요.");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("로그인 실패");
    else { setUser(data.user); fetchFromDB(); }
  };

  // 3. 디자인 가공 (원본 스타일)
  const grouped = useMemo(() => entries.reduce((acc: any, cur) => {
    acc[cur.work] = acc[cur.work] || [];
    acc[cur.work].push(cur);
    return acc;
  }, {}), [entries]);

  if (!user && entries.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f2] font-serif">
        <div className="w-64 space-y-4 text-center">
          <h1 className="text-3xl italic mb-10">Archive</h1>
          <input className="w-full bg-transparent border-b border-black/20 py-2 outline-none" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full bg-transparent border-b border-black/20 py-2 outline-none" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button onClick={handleLogin} className="w-full py-3 bg-black text-white rounded-full text-xs tracking-widest">LOGIN</button>
          <button onClick={() => setUser({id: 'guest'})} className="text-[10px] opacity-40 underline mt-4 block w-full text-center">로그인 없이 사용하기 (로컬저장)</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-10 transition-all" style={{ backgroundColor: bgColor, fontFamily: 'serif' }}>
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="flex justify-between items-baseline border-b border-black/5 pb-4">
          <h1 className="text-4xl italic font-bold cursor-pointer" onClick={()=>setMode("write")}>Archive</h1>
          <nav className="space-x-6 text-sm">
            <button onClick={()=>setMode("write")} className={mode==="write" ? "font-bold" : "opacity-30"}>Write</button>
            <button onClick={()=>setMode("archive")} className={mode==="archive" ? "font-bold" : "opacity-30"}>Read</button>
          </nav>
        </header>

        {mode === "write" && (
          <div className="space-y-6 animate-in fade-in">
            <input placeholder="작품명" value={work} onChange={e=>setWork(e.target.value)} className="w-full text-2xl font-bold bg-transparent border-b border-black/10 py-2 outline-none" />
            <div className="grid grid-cols-2 gap-4">
              <input placeholder="날짜" value={date} onChange={e=>setDate(e.target.value)} className="bg-transparent border-b border-black/10 py-2 outline-none" />
              <input placeholder="캐릭터" value={character} onChange={e=>setCharacter(e.target.value)} className="bg-transparent border-b border-black/10 py-2 outline-none font-bold" />
            </div>
            <textarea placeholder="문장을 기록하세요..." value={text} onChange={e=>setText(e.target.value)} className="w-full h-64 bg-transparent border-none outline-none text-lg leading-relaxed resize-none" style={{ fontSize: lineSize }} />
            <div className="flex justify-end">
              <button onClick={save} className="px-10 py-3 bg-black text-white rounded-full text-xs font-bold tracking-widest hover:opacity-80 transition-all">
                {editingId ? "UPDATE" : "SAVE"}
              </button>
            </div>
          </div>
        )}

        {mode === "archive" && (
          <div className="space-y-10 animate-in fade-in">
            {Object.entries(grouped).map(([title, list]: any) => (
              <div key={title} className="space-y-4">
                <h2 className="text-xl font-bold italic border-b border-black/5 pb-1">{title}</h2>
                {list.map((e: any) => (
                  <div key={e.id} className="group border-l-2 border-black/5 pl-4 py-2 hover:border-black transition-all">
                    <p className="text-lg leading-relaxed opacity-80 mb-2">{e.text}</p>
                    <div className="flex justify-between items-center text-[10px] opacity-30 uppercase tracking-widest">
                      <span>{e.date} · {e.character}</span>
                      <div className="space-x-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setMode("write"); setEditingId(e.id); setWork(e.work); setDate(e.date); setCharacter(e.character); setText(e.text); }}>Edit</button>
                        <button onClick={async () => {
                          const updated = entries.filter(item => item.id !== e.id);
                          setEntries(updated);
                          localStorage.setItem("my_archive_data", JSON.stringify(updated));
                          if(supabase && user && e.db_id) await supabase.from("entries").delete().eq('id', e.db_id);
                        }} className="text-red-500">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
