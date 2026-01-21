import { useMemo, useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom/client";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://dctinbgpmxsfyexnfvbi.supabase.co", 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdGluYmdwbXhzZnlleG5mdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDU4NDQsImV4cCI6MjA4NDU4MTg0NH0.SPiNc-q-u6xHlb5H82EFvl8xBUmzuCIs8w6WS9tauyY"
);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // --- [상태 관리] ---
  const [entries, setEntries] = useState<any[]>([]);
  const [mode, setMode] = useState<"write" | "archive" | "style">("write");
  const [openWork, setOpenWork] = useState<string | null>(null);
  const [openEntryId, setOpenEntryId] = useState<number | null>(null);
  const [focusEntry, setFocusEntry] = useState<any | null>(null);

  // 스타일 상태 (초기값)
  const [bgColor, setBgColor] = useState("#f5f5f2");
  const [textColor, setTextColor] = useState("#3a3a3a");
  const [lineSize, setLineSize] = useState(16);
  const [night, setNight] = useState(false);

  // 입력 필드 상태
  const [work, setWork] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [keywords, setKeywords] = useState("");
  const [character, setCharacter] = useState("");
  const [text, setText] = useState("");
  const [comment, setComment] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const [query, setQuery] = useState("");
  const [onlyFavorite, setOnlyFavorite] = useState(false);

  // --- [데이터 불러오기: 기록 + 스타일] ---
  const fetchData = useCallback(async (userId: string) => {
    // 1. 기록 불러오기
    const { data: entryData } = await supabase.from("entries").select("*").eq("user_id", userId);
    if (entryData) {
      setEntries(entryData.map(d => ({ ...d.content, db_id: d.id, id: d.content.id || d.id })));
    }
    // 2. 스타일 불러오기 (profiles 테이블이 있다면)
    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (profileData?.settings) {
      const s = profileData.settings;
      if (s.bgColor) setBgColor(s.bgColor);
      if (s.textColor) setTextColor(s.textColor);
      if (s.lineSize) setLineSize(s.lineSize);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchData(session.user.id);
      }
    });
  }, [fetchData]);

  // --- [기능: 로그인] ---
  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("로그인 실패: " + error.message);
    else { setUser(data.user); fetchData(data.user.id); }
  };

  // --- [기능: 기록 저장] ---
  const save = async () => {
    if (!work || !date || !text || !user) return;
    const payload = { 
      work, date, time, character, text, comment, 
      keywords: keywords.split(",").map(k => k.trim()).filter(Boolean) 
    };

    if (editingId) {
      const target = entries.find(e => e.id === editingId);
      await supabase.from("entries").update({ 
        content: { ...payload, favorite: target.favorite, id: editingId } 
      }).eq('id', target.db_id);
    } else {
      await supabase.from("entries").insert([{ 
        content: { ...payload, id: Date.now(), favorite: false }, 
        user_id: user.id 
      }]);
    }
    
    // 초기화 및 리프레시
    setWork(""); setDate(""); setTime(""); setKeywords(""); setCharacter(""); setText(""); setComment("");
    setEditingId(null);
    fetchData(user.id);
  };

  // --- [기능: 스타일 저장] ---
  const saveStyle = async (newSettings: any) => {
    if (!user) return;
    // 스타일을 profiles 테이블의 settings 컬럼(JSON)에 저장
    await supabase.from("profiles").upsert({ 
      id: user.id, 
      settings: { bgColor, textColor, lineSize, ...newSettings } 
    });
  };

  // --- [원본 로직 유지] ---
  const filtered = useMemo(() => {
    let base = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    if (onlyFavorite) base = base.filter(e => e.favorite);
    if (query) base = base.filter(e => e.text.includes(query));
    return base;
  }, [entries, onlyFavorite, query]);

  const grouped = useMemo(() => filtered.reduce((acc: any, cur) => {
    acc[cur.work] = acc[cur.work] || [];
    acc[cur.work].push(cur);
    return acc;
  }, {}), [filtered]);

  const activeBg = night ? "#141414" : bgColor;
  const activeText = night ? "#e5e5e5" : textColor;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f2] font-serif">
        <div className="w-64 space-y-4">
          <h1 className="text-2xl text-center mb-8">ARCHIVE</h1>
          <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full border-b bg-transparent py-2 outline-none" />
          <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border-b bg-transparent py-2 outline-none" />
          <button onClick={handleLogin} className="w-full py-2 border rounded-full text-xs">LOGIN</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 py-6" style={{ backgroundColor: activeBg, color: activeText }}>
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-10">
        <h1 className="text-3xl font-serif italic">Archive</h1>
        <div className="flex gap-4 text-sm opacity-50">
          <button onClick={() => setMode("write")} className={mode === "write" ? "font-bold opacity-100" : ""}>Write</button>
          <button onClick={() => setMode("archive")} className={mode === "archive" ? "font-bold opacity-100" : ""}>List</button>
          <button onClick={() => setMode("style")} className={mode === "style" ? "font-bold opacity-100" : ""}>Style</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        {mode === "write" && (
          <div className="space-y-6">
            <input placeholder="작품명" value={work} onChange={e=>setWork(e.target.value)} className="w-full text-xl bg-transparent border-b border-black/5 py-2 outline-none font-bold" />
            <div className="grid grid-cols-2 gap-4">
              <input placeholder="날짜" value={date} onChange={e=>setDate(e.target.value)} className="bg-transparent border-b border-black/5 py-2 outline-none" />
              <input placeholder="인물" value={character} onChange={e=>setCharacter(e.target.value)} className="bg-transparent border-b border-black/5 py-2 outline-none font-bold" />
            </div>
            <textarea placeholder="기록할 문장..." value={text} onChange={e=>setText(e.target.value)} className="w-full h-64 bg-transparent border-none outline-none text-lg leading-relaxed resize-none" />
            <button onClick={save} className="px-10 py-2 border border-current rounded-full text-xs">SAVE</button>
          </div>
        )}

        {mode === "archive" && (
          <div className="space-y-10">
            <input placeholder="검색..." value={query} onChange={e=>setQuery(e.target.value)} className="w-full bg-transparent border-b border-black/5 py-2 outline-none italic" />
            {Object.entries(grouped).map(([title, list]: any) => (
              <div key={title} className="space-y-4">
                <h2 className="text-[10px] tracking-[0.2em] opacity-30 border-b border-black/5 pb-1">{title}</h2>
                {list.map((e: any) => (
                  <div key={e.id} className="group cursor-pointer" onClick={() => setOpenEntryId(openEntryId === e.id ? null : e.id)}>
                    <p className="text-lg leading-relaxed opacity-70 group-hover:opacity-100">{e.text}</p>
                    {openEntryId === e.id && (
                      <div className="flex gap-4 text-[10px] opacity-40 pt-2">
                        <button onClick={() => { setMode("write"); setEditingId(e.id); setWork(e.work); setDate(e.date); setCharacter(e.character); setText(e.text); }}>EDIT</button>
                        <button onClick={async () => { if(confirm("삭제?")) { await supabase.from("entries").delete().eq('id', e.db_id); fetchData(user.id); } }}>DELETE</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {mode === "style" && (
          <div className="space-y-8 max-w-xs">
            <div>
              <label className="text-[10px] opacity-40 block mb-2">BACKGROUND COLOR</label>
              <input type="text" value={bgColor} onChange={e => { setBgColor(e.target.value); saveStyle({bgColor: e.target.value}); }} className="w-full bg-transparent border-b border-black/10 py-1 outline-none" />
            </div>
            <div>
              <label className="text-[10px] opacity-40 block mb-2">FONT SIZE ({lineSize}px)</label>
              <input type="range" min="12" max="24" value={lineSize} onChange={e => { setLineSize(+e.target.value); saveStyle({lineSize: +e.target.value}); }} className="w-full" />
            </div>
            <button onClick={() => { supabase.auth.signOut(); setUser(null); }} className="text-xs opacity-30 underline">Sign Out</button>
          </div>
        )}
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
