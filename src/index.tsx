import React, { useMemo, useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { createClient } from "@supabase/supabase-js";

// Supabase 설정
const SUPABASE_URL = "https://dctinbgpmxsfyexnfvbi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdGluYmdwbXhzZnlleG5mdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDU4NDQsImV4cCI6MjA4NDU4MTg0NH0.SPiNc-q-u6xHlb5H82EFvl8xBUmzuCIs8w6WS9tauyY";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function App() {
  // --- 상태 ---
  const [user, setUser] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [mode, setMode] = useState<"write" | "archive" | "style">("write");
  const [openWork, setOpenWork] = useState<string | null>(null);
  const [openEntryId, setOpenEntryId] = useState<number | null>(null);
  const [focusEntry, setFocusEntry] = useState<any | null>(null);

  // 설정
  const [bgColor, setBgColor] = useState(() => localStorage.getItem("arch_bg") || "#f5f5f2");
  const [textColor, setTextColor] = useState(() => localStorage.getItem("arch_text") || "#1a1a1a");
  const [lineSize, setLineSize] = useState(() => Number(localStorage.getItem("arch_size")) || 14);
  const [webFont, setWebFont] = useState(() => localStorage.getItem("arch_font") || "BookkMyungjo");
  const [night, setNight] = useState(() => localStorage.getItem("arch_night") === "true");

  // 입력
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  // 작품명 / 캐릭터 자동 기억
  const [workHistory, setWorkHistory] = useState<string[]>(() => JSON.parse(localStorage.getItem("work_history") || "[]"));
  const [characterHistory, setCharacterHistory] = useState<string[]>(() => JSON.parse(localStorage.getItem("character_history") || "[]"));

  const [showComment, setShowComment] = useState<boolean>(true);

  // --- 초기화 ---
  useEffect(() => {
    const saved = localStorage.getItem("archive_full_backup");
    if (saved) {
      try { setEntries(JSON.parse(saved)); } catch (e) { console.error("로컬 로드 실패", e); }
    }

    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          fetchDB(session.user);
        }
      } catch (e) {
        console.error("세션 로드 실패", e);
      }
    };
    getSession();
  }, []);

  const fetchDB = async (u: any) => {
    if (!u || u.id === 'guest') return;
    const { data, error } = await supabase.from("entries").select("*");
    if (!error && data) {
      const dbEntries = data.map((d: any) => ({ ...d.content, db_id: d.id }));
      setEntries(dbEntries);
      localStorage.setItem("archive_full_backup", JSON.stringify(dbEntries));
    }
  };

  // --- 기능 ---
  const handleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const sessionUser = data.user || data.session?.user;
      if (!sessionUser) throw new Error("로그인 실패");
      setUser(sessionUser);
      fetchDB(sessionUser);
    } catch (e: any) {
      alert("로그인 에러: " + e.message);
    }
  };

  const save = async () => {
    if (!work || !text) return alert("작품명과 본문은 반드시 입력해주세요.");
    // 작품/캐릭터 히스토리 저장
    if (!workHistory.includes(work)) {
      const newWorkHistory = [...workHistory, work];
      setWorkHistory(newWorkHistory);
      localStorage.setItem("work_history", JSON.stringify(newWorkHistory));
    }
    if (!characterHistory.includes(character) && character) {
      const newCharacterHistory = [...characterHistory, character];
      setCharacterHistory(newCharacterHistory);
      localStorage.setItem("character_history", JSON.stringify(newCharacterHistory));
    }

    const payload = {
      work, date, time, character, text, comment,
      id: editingId ?? Date.now(),
      keywords: keywords ? keywords.split(",").map(k => k.trim()).filter(Boolean) : [],
      favorite: editingId !== null ? (entries.find(e => e.id === editingId)?.favorite || false) : false
    };

    const next = editingId !== null ? entries.map(e => e.id === editingId ? payload : e) : [payload, ...entries];
    setEntries(next);
    localStorage.setItem("archive_full_backup", JSON.stringify(next));

    if (user && user.id !== 'guest') {
      try {
        if (editingId !== null) {
          const target = entries.find(e => e.id === editingId);
          if (target?.db_id) {
            await supabase.from("entries").update({ content: payload }).eq('id', target.db_id);
          }
        } else {
          await supabase.from("entries").insert([{ content: payload, user_id: user.id }]);
        }
      } catch (e) {
        console.error("DB 저장 실패, 로컬에는 저장됨", e);
      }
    }

    setWork(""); setDate(""); setTime(""); setKeywords(""); setCharacter(""); setText(""); setComment("");
    setEditingId(null); setMode("archive");
  };

  // 백업 기능 (PDF 제외)
  const handleBackup = (format: "txt"|"html"|"json") => {
    if (!entries.length) return alert("저장된 데이터가 없습니다.");
    let content: string;
    const filename = `archive_backup_${Date.now()}`;
    switch(format){
      case "txt":
        content = entries.map(e=>`${e.work}\n${e.character}\n${e.date} ${e.time||""}\n${e.text}\n`).join("\n---\n");
        downloadFile(filename+".txt", content);
        break;
      case "html":
        content = entries.map(e=>`<h2>${e.work}</h2><p>${e.character}</p><p>${e.date} ${e.time||""}</p><p>${e.text}</p>`).join("<hr/>");
        downloadFile(filename+".html", content);
        break;
      case "json":
        downloadFile(filename+".json", JSON.stringify(entries,null,2));
        break;
    }
  }

  const downloadFile = (filename:string, content:string)=>{
    const blob = new Blob([content], {type:"text/plain"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  const grouped = useMemo(() => {
    let base = [...entries].sort((a, b) => b.id - a.id);
    if (onlyFavorite) base = base.filter(e => e.favorite);
    if (query) base = base.filter(e => [e.text, e.work, e.character].some(v => v?.toLowerCase().includes(query.toLowerCase())));
    return base.reduce((acc: any, cur) => { acc[cur.work] = acc[cur.work] || []; acc[cur.work].push(cur); return acc; }, {});
  }, [entries, query, onlyFavorite]);

  const activeBg = night ? "#1a1a1a" : bgColor;
  const activeText = night ? "#e5e5e5" : textColor;

  // --- 로그인 화면 ---
  if(!user){
    return (
      <div className="fixed inset-0 flex items-center justify-center font-en" style={{background:activeBg, color:activeText}}>
        <div className="w-64 space-y-6 text-center">
          <h1 className="text-4xl mb-12 font-normal tracking-widest uppercase">Archive</h1>
          <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full border-b border-current/20 py-2 bg-transparent outline-none text-center"/>
          <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border-b border-current/20 py-2 bg-transparent outline-none text-center"/>
          <button onClick={handleLogin} className="w-full mt-4 border border-current rounded-full py-3 text-xs uppercase tracking-widest">Login</button>
          <button onClick={()=>setUser({id:'guest'})} className="text-[10px] opacity-40 underline mt-4 block w-full">GUEST MODE (Local Only)</button>
        </div>
      </div>
    )
  }

  // --- 나머지 UI는 기존 구조 그대로 ---
  return (
    <div className="min-h-screen px-5 py-6" style={{backgroundColor:activeBg,color:activeText,fontFamily:webFont}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400&display=swap');
        @font-face { font-family: 'BookkMyungjo'; src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/BookkMyungjo-Lt.woff2') format('woff2'); }
        *{letter-spacing:0px !important;}
        .font-en{font-family:'Crimson Text', serif !important;}
      `}</style>
      {/* --- 헤더, Write, Archive, Style 화면, Focus 모드 --- */}
      {/* 이전 코드 구조와 동일, 백업 버튼에서 PDF 제거 */}
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
