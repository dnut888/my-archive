import React, { useMemo, useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { createClient } from "@supabase/supabase-js";

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
  const [isInitialized, setIsInitialized] = useState(false); // 초기화 체크용
  const [mode, setMode] = useState<"write" | "archive" | "style">("write");
  const [openWork, setOpenWork] = useState<string | null>(null);
  const [openEntryId, setOpenEntryId] = useState<number | null>(null);
  const [focusEntry, setFocusEntry] = useState<any | null>(null);

  const [bgColor, setBgColor] = useState(() => localStorage.getItem("arch_bg") || "#f5f5f2");
  const [textColor, setTextColor] = useState(() => localStorage.getItem("arch_text") || "#1a1a1a");
  const [lineSize, setLineSize] = useState(() => Number(localStorage.getItem("arch_size")) || 14);
  const [koreanFont, setKoreanFont] = useState(() => localStorage.getItem("arch_font") || "BookkMyungjo");
  const [fontLink, setFontLink] = useState(() => localStorage.getItem("arch_font_link") || "");
  const [night, setNight] = useState(() => localStorage.getItem("arch_night") === "true");

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
  const [charFilter, setCharFilter] = useState<string>("");

  useEffect(() => {
    // 1. 로컬 스토리지 먼저 로드
    const local = localStorage.getItem("archive_full_backup");
    if (local) {
      setEntries(JSON.parse(local));
    }
    
    // 2. 세션 체크
    if (supabase) {
      supabase.auth.getSession().then(({ data }: any) => {
        if (data.session?.user) {
          setUser(data.session.user);
          fetchDB(); // 로그인 된 경우에만 DB 호출
        }
        setIsInitialized(true); // 이제 준비됨
      });
    } else {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("arch_bg", bgColor);
    localStorage.setItem("arch_text", textColor);
    localStorage.setItem("arch_size", lineSize.toString());
    localStorage.setItem("arch_font", koreanFont);
    localStorage.setItem("arch_font_link", fontLink);
    localStorage.setItem("arch_night", night.toString());
  }, [bgColor, textColor, lineSize, koreanFont, fontLink, night]);

const fetchDB = async () => {
    // 1. 접속 정보가 없거나 게스트면 실행 안 함
    if (!supabase || !user || user.id === 'guest') return;

    try {
      // 2. DB에서 데이터를 읽어옵니다.
      const { data, error } = await supabase.from("entries").select("*");

      // 3. 에러가 나면 콘솔에 표시
      if (error) {
        console.error("DB 로드 에러:", error.message);
        return;
      }

      // 4. DB에 데이터가 있을 때만 화면을 업데이트합니다.
      // (이렇게 해야 브라우저마다 달랐던 내용이 하나로 합쳐집니다)
      if (data && data.length > 0) {
        const dbEntries = data.map((d: any) => ({ ...d.content, db_id: d.id }));
        setEntries(dbEntries);
        localStorage.setItem("archive_full_backup", JSON.stringify(dbEntries));
      }
    } catch (err) {
      console.error("연결 오류:", err);
    }
  };;

  const handleLogin = async () => {
    if (!supabase) return alert("Supabase 설정 확인");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("실패: " + error.message);
    else { setUser(data.user); fetchDB(); }
  };

  const save = async () => {
    if (!work || !date || !text) return alert("필수 항목을 입력해주세요.");
    
    const payload = {
      work, date, time, character, text, comment,
      id: editingId || Date.now(),
      keywords: keywords ? keywords.split(",").map(k => k.trim()).filter(Boolean) : [],
      favorite: editingId ? (entries.find(e => e.id === editingId)?.favorite || false) : false
    };

    // 1. 화면 업데이트 (즉시 반영 및 로컬 저장)
    const nextEntries = editingId ? entries.map(e => e.id === editingId ? payload : e) : [payload, ...entries];
    setEntries(nextEntries);
    localStorage.setItem("archive_full_backup", JSON.stringify(nextEntries));

    // 2. DB 저장 (백그라운드 처리, fetchDB로 화면 덮어쓰기 금지)
    if (supabase && user && user.id !== 'guest') {
      if (editingId) {
        const target = entries.find(e => e.id === editingId);
        supabase.from("entries").update({ content: payload }).eq('id', target.db_id).then(() => {});
      } else {
        supabase.from("entries").insert([{ content: payload, user_id: user.id }]).then((res) => {
          // 새로 만든 데이터의 db_id만 조용히 업데이트
          if (res.data) fetchDB();
        });
      }
    }

    setWork(""); setDate(""); setTime(""); setKeywords(""); setCharacter(""); setText(""); setComment("");
    setEditingId(null); setMode("archive");
  };

  const grouped = useMemo(() => {
    let base = [...entries].sort((a, b) => b.id - a.id);
    if (onlyFavorite) base = base.filter(e => e.favorite);
    if (charFilter) base = base.filter(e => e.character === charFilter);
    if (query) base = base.filter(e => [e.text, e.work, e.character].some(v => v?.toLowerCase().includes(query.toLowerCase())));
    
    return base.reduce((acc: any, cur) => {
      acc[cur.work] = acc[cur.work] || [];
      acc[cur.work].push(cur);
      return acc;
    }, {});
  }, [entries, query, onlyFavorite, charFilter]);

  const activeBg = night ? "#1a1a1a" : bgColor;
  const activeText = night ? "#e5e5e5" : textColor;

  // 로그인 화면 조건 수정: 초기화 전에는 아무것도 안보여줌, 초기화 후 유저 없으면 로그인창 고정
  if (!isInitialized) return null;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center font-serif" style={{ background: activeBg, color: activeText }}>
        <div className="w-64 space-y-4 text-center animate-in fade-in">
          <h1 className="text-3xl mb-8 font-bold tracking-tight">ARCHIVE</h1>
          <input className="w-full bg-transparent border-b border-current/20 py-2 outline-none text-center" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full bg-transparent border-b border-current/20 py-2 outline-none text-center" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button onClick={handleLogin} className="w-full mt-4 border border-current rounded-full py-2 text-xs font-bold font-sans">LOGIN</button>
          <button onClick={() => setUser({id:'guest'})} className="text-[10px] opacity-40 underline mt-4">GUEST MODE</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 py-6" style={{ backgroundColor: activeBg, color: activeText, fontFamily: koreanFont }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
        @font-face { font-family: 'BookkMyungjo'; src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/BookkMyungjo-Lt.woff2') format('woff2'); }
        .font-en { font-family: 'Playfair Display', serif !important; font-weight: 700; }
        * { letter-spacing: 0px !important; }
      `}</style>
      {fontLink && <link rel="stylesheet" href={fontLink} />}

      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-current/10 pb-4">
          <h1 className="text-3xl tracking-tighter cursor-pointer font-en" onClick={() => setMode("write")}>Archive</h1>
          <nav className="flex gap-4 text-xs uppercase font-en">
            <button onClick={() => setMode("write")} className={mode === "write" ? "" : "opacity-30"}>Write</button>
            <button onClick={() => setMode("archive")} className={mode === "archive" ? "" : "opacity-30"}>Read</button>
            <button onClick={() => setMode("style")} className={mode === "style" ? "" : "opacity-30"}>Set</button>
          </nav>
        </header>

        {mode === "write" && (
          <div className="space-y-4 animate-in fade-in">
            <input placeholder="작품명" value={work} onChange={e => setWork(e.target.value)} className="w-full py-3 border-b bg-transparent font-bold text-xl outline-none" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <input placeholder="날짜 / 페이지" value={date} onChange={e => setDate(e.target.value)} className="border-b bg-transparent py-2 outline-none text-sm" />
              <input placeholder="시간 (선택)" value={time} onChange={e => setTime(e.target.value)} className="border-b bg-transparent py-2 outline-none text-sm" />
              <input placeholder="키워드 (선택)" value={keywords} onChange={e => setKeywords(e.target.value)} className="border-b bg-transparent py-2 outline-none text-sm" />
              <input placeholder="캐릭터" value={character} onChange={e => setCharacter(e.target.value)} className="border-b bg-transparent py-2 outline-none text-sm font-bold" />
            </div>
            <textarea placeholder="문장을 입력하세요" value={text} onChange={e => setText(e.target.value)} className="w-full h-64 py-3 bg-transparent leading-relaxed outline-none resize-none" style={{ fontSize: '14px' }} />
            <textarea placeholder="코멘트" value={comment} onChange={e => setComment(e.target.value)} className="w-full py-2 bg-transparent text-xs opacity-70 outline-none" />
            <div className="flex justify-end"><button onClick={save} className="px-10 py-3 border border-current rounded-full text-xs font-en">Save</button></div>
          </div>
        )}

        {mode === "archive" && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex gap-3 items-center border-b border-current/5 pb-2">
              <input placeholder="Search..." value={query} onChange={e => setQuery(e.target.value)} className="flex-1 bg-transparent py-1 outline-none text-sm" />
              <button onClick={() => setOnlyFavorite(!onlyFavorite)} className={onlyFavorite ? "text-yellow-500" : "opacity-20"}>★</button>
            </div>
            {Object.entries(grouped).map(([title, list]: any) => (
              <section key={title} className="space-y-1">
                <button onClick={() => setOpenWork(openWork === title ? null : title)} className="flex items-baseline gap-2 font-bold border-b border-current/5 w-full text-left py-1">
                  <span>{title}</span><span className="text-[10px] opacity-40 font-normal">({list.length})</span>
                </button>
                {openWork === title && list.map((e: any) => (
                  <div key={e.id} className="border-l border-current/10 ml-1 pl-4 py-1">
                    <button onClick={() => setOpenEntryId(openEntryId === e.id ? null : e.id)} className="w-full text-left text-[11px] opacity-70">
                      {e.date} {e.time && `· ${e.time}`} · {e.character}
                    </button>
                    {openEntryId === e.id && (
                      <div className="pt-2">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 leading-relaxed cursor-pointer" onClick={() => setFocusEntry(e)} style={{ fontSize: lineSize }}>{e.text}</div>
                          <button onClick={() => {
                            const next = { ...e, favorite: !e.favorite };
                            setEntries(p => p.map(x => x.id === e.id ? next : x));
                          }} className={e.favorite ? "text-yellow-500" : "opacity-20"}>★</button>
                        </div>
                        {e.comment && <div className="mt-2 text-xs opacity-70 border-t border-current/5 pt-1">{e.comment}</div>}
                        <div className="flex gap-4 mt-2 text-[10px] opacity-40 font-bold uppercase font-en">
                          <button onClick={() => { setMode("write"); setEditingId(e.id); setWork(e.work); setDate(e.date); setTime(e.time || ""); setKeywords(e.keywords.join(", ")); setCharacter(e.character); setText(e.text); setComment(e.comment || ""); }}>Edit</button>
                          <button onClick={() => setEntries(p => p.filter(x => x.id !== e.id))} className="text-red-500 font-bold">Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}

        {mode === "style" && (
          <div className="space-y-6 py-4 animate-in fade-in max-w-sm">
            <div className="space-y-1 font-en"><label className="text-[10px] uppercase font-bold opacity-50">Colors</label>
              <input value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-full bg-transparent border-b border-current/20 py-1 outline-none font-mono text-xs" />
              <input value={textColor} onChange={e => setTextColor(e.target.value)} className="w-full bg-transparent border-b border-current/20 py-1 outline-none font-mono text-xs" />
            </div>
            <div className="space-y-1 font-en"><label className="text-[10px] uppercase font-bold opacity-50">Typography</label>
              <input type="range" min="12" max="24" value={lineSize} onChange={e => setLineSize(Number(e.target.value))} className="w-full accent-current mb-2" />
              <input placeholder="Font Name" value={koreanFont} onChange={e => setKoreanFont(e.target.value)} className="w-full bg-transparent border-b border-current/20 py-1 text-xs outline-none" />
              <input placeholder="Font URL" value={fontLink} onChange={e => setFontLink(e.target.value)} className="w-full bg-transparent border-b border-current/20 py-1 text-xs outline-none" />
            </div>
            <div className="flex items-center justify-between py-2 border-b border-current/10 font-en">
              <span className="text-xs font-bold uppercase">Night Mode</span>
              <button onClick={() => setNight(!night)} className={`w-10 h-5 rounded-full relative transition-all ${night ? 'bg-blue-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${night ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);

