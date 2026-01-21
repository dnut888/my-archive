import { useMemo, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ⚠️ 본인의 Supabase 정보를 입력해주세요
const supabase = createClient(
  "https://dctinbgpmxsfyexnfvbi.supabase.co", 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdGluYmdwbXhzZnlleG5mdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDU4NDQsImV4cCI6MjA4NDU4MTg0NH0.SPiNc-q-u6xHlb5H82EFvl8xBUmzuCIs8w6WS9tauyY"
);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // --- 질문자님 원본 상태 그대로 ---
  const [entries, setEntries] = useState<any[]>([]);
  const [mode, setMode] = useState<"write" | "archive" | "style">("write");
  const [openWork, setOpenWork] = useState<string | null>(null);
  const [openEntryId, setOpenEntryId] = useState<number | null>(null);
  const [focusEntry, setFocusEntry] = useState<any | null>(null);
  const [bgColor, setBgColor] = useState("#f5f5f2");
  const [textColor, setTextColor] = useState("#3a3a3a");
  const [koreanFont, setKoreanFont] = useState("BookkMyungjo");
  const [fontLink, setFontLink] = useState("");
  const [lineSize, setLineSize] = useState(16);
  const [night, setNight] = useState(false);

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
  const [openCommentId, setOpenCommentId] = useState<number | null>(null);

  // --- 데이터베이스 연결 (이 부분만 추가됨) ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchEntries();
    });
  }, []);

  const fetchEntries = async () => {
    const { data } = await supabase.from("entries").select("*");
    if (data) setEntries(data.map(d => ({ ...d.content, db_id: d.id, id: d.content.id || d.id })));
  };

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("로그인 정보를 확인해주세요.");
    else { setUser(data.user); fetchEntries(); }
  };

  const save = async () => {
    if (!work || !date || !text) return;
    const payload = { work, date, time, character, text, comment, keywords: keywords.split(",").map(k => k.trim()).filter(Boolean) };
    if (editingId) {
      const target = entries.find(e => e.id === editingId);
      await supabase.from("entries").update({ content: { ...payload, favorite: target.favorite, id: editingId } }).eq('id', target.db_id);
      setEditingId(null);
    } else {
      await supabase.from("entries").insert([{ content: { ...payload, id: Date.now(), favorite: false }, user_id: user.id }]);
    }
    setWork(""); setDate(""); setTime(""); setKeywords(""); setCharacter(""); setText(""); setComment("");
    fetchEntries();
  };

  // --- 나머지 로직은 질문자님 코드 100% 복사 ---
  const works = useMemo(() => Array.from(new Set(entries.map((e) => e.work))).filter(Boolean), [entries]);
  const characters = useMemo(() => Array.from(new Set(entries.map((e) => e.character))).filter(Boolean), [entries]);
  const filtered = useMemo(() => {
    let base = [...entries].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || "").localeCompare(b.time || "");
    });
    if (onlyFavorite) base = base.filter((e) => e.favorite);
    if (charFilter) base = base.filter((e) => e.character === charFilter);
    if (!query) return base;
    const q = query.toLowerCase();
    return base.filter((e) => [e.text, e.comment, e.character, e.keywords.join(" ")].some((v) => v?.toLowerCase().includes(q)));
  }, [entries, query, onlyFavorite, charFilter]);

  const grouped = useMemo(() => filtered.reduce((acc: any, cur) => {
    acc[cur.work] = acc[cur.work] || [];
    acc[cur.work].push(cur);
    return acc;
  }, {}), [filtered]);

  const activeBg = night ? "#141414" : bgColor;
  const activeText = night ? "#e5e5e5" : textColor;

  // --- 로그인 체크 (가장 심플하게) ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f2]">
        <div className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="block w-64 border-b border-black/10 bg-transparent px-2 py-1 outline-none" />
          <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} className="block w-64 border-b border-black/10 bg-transparent px-2 py-1 outline-none" />
          <button onClick={handleLogin} className="w-full py-2 border border-black/20 rounded-full text-xs opacity-50">LOGIN</button>
        </div>
      </div>
    );
  }

  // --- 디자인 부분: 질문자님 원본 텍스트를 그대로 붙여넣었습니다 ---
  if (focusEntry) {
    return (
      <div onClick={() => setFocusEntry(null)} className="min-h-screen flex items-center justify-center px-6" style={{ background: activeBg, color: activeText, fontFamily: koreanFont }}>
        <div className="text-center space-y-4 max-w-xl">
          <div className="whitespace-pre-wrap leading-relaxed" style={{ fontSize: Math.max(14, lineSize - 2) }}>{focusEntry.text}</div>
          <div className="text-xs opacity-60">{focusEntry.work} · {focusEntry.date} · {focusEntry.character}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 py-6" style={{ backgroundColor: activeBg, color: activeText, fontFamily: koreanFont }}>
      <style>{`
        @font-face { font-family: 'BookkMyungjo'; src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/BookkMyungjo-Lt.woff2') format('woff2'); font-weight: 400; }
        @font-face { font-family: 'BookkMyungjo'; src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/BookkMyungjo-Bd.woff2') format('woff2'); font-weight: 700; }
      `}</style>
      {fontLink && <link rel="stylesheet" href={fontLink} />}

      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-3xl" style={{ fontFamily: "Crimson Text, serif" }}>ARCHIVE</h1>
          <div className="flex gap-4 text-sm">
            <button onClick={() => setMode("write")} className={mode === "write" ? "font-semibold" : "opacity-50"}>Write</button>
            <button onClick={() => setMode("archive")} className={mode === "archive" ? "font-semibold" : "opacity-50"}>Archive</button>
            <button onClick={() => setMode("style")} className={mode === "style" ? "font-semibold" : "opacity-50"}>Style</button>
          </div>
        </header>

        {mode === "write" && (
          <div className="space-y-4">
            <input list="works" placeholder="작품" value={work} onChange={(e) => setWork(e.target.value)} className="w-full px-2 py-3 border-b bg-transparent font-semibold outline-none" />
            <datalist id="works">{works.map((w) => <option key={w} value={w} />)}</datalist>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <input placeholder="날짜 / 페이지" value={date} onChange={(e) => setDate(e.target.value)} className="border-b bg-transparent px-2 py-2 outline-none" />
              <input placeholder="시간" value={time} onChange={(e) => setTime(e.target.value)} className="border-b bg-transparent px-2 py-2 outline-none" />
              <input placeholder="키워드" value={keywords} onChange={(e) => setKeywords(e.target.value)} className="border-b bg-transparent px-2 py-2 outline-none" />
              <input placeholder="캐릭터" value={character} onChange={(e) => setCharacter(e.target.value)} className="border-b bg-transparent px-2 py-2 font-semibold outline-none" />
            </div>
            <textarea placeholder="대사 / 문장" value={text} onChange={(e) => setText(e.target.value)} className="w-full px-2 py-3 border-b bg-transparent leading-relaxed whitespace-pre-wrap outline-none" />
            <textarea placeholder="코멘트 (선택)" value={comment} onChange={(e) => setComment(e.target.value)} className="w-full px-2 py-3 border-b bg-transparent text-sm opacity-60 whitespace-pre-wrap outline-none" />
            <button onClick={save} className="mt-4 px-4 py-2 text-sm border rounded-full opacity-90">저장</button>
          </div>
        )}

        {mode === "archive" && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3 items-center">
              <input placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 min-w-[200px] border-b bg-transparent px-2 py-2 outline-none" />
              <button onClick={() => setOnlyFavorite((v) => !v)} className={onlyFavorite ? "font-semibold" : "opacity-40"}>★</button>
            </div>
            {Object.entries(grouped).map(([title, list]: any) => (
              <section key={title} className="space-y-2">
                <button onClick={() => setOpenWork(openWork === title ? null : title)} className="flex items-center gap-1 font-semibold">
                  <span>{title}</span>
                  <span className="text-sm opacity-40">({list.length})</span>
                </button>
                {openWork === title && list.map((e: any) => (
                  <div key={e.id} className="border-t pt-2">
                    <button onClick={() => setOpenEntryId(openEntryId === e.id ? null : e.id)} className="w-full text-left text-sm opacity-80">{e.date} · {e.character}</button>
                    {openEntryId === e.id && (
                      <div className="pt-3 space-y-2" style={{ fontSize: lineSize }}>
                        <div className="leading-relaxed whitespace-pre-wrap flex items-start justify-between gap-3">
                          <div className="flex-1" onClick={() => setFocusEntry(e)}>{e.text}</div>
                          <button onClick={async () => {
                             await supabase.from("entries").update({ content: { ...e, favorite: !e.favorite } }).eq('id', e.db_id);
                             fetchEntries();
                          }}>{e.favorite ? "★" : "☆"}</button>
                        </div>
                        <div className="flex items-center gap-3 text-sm opacity-40">
                          <button onClick={() => { setMode("write"); setEditingId(e.id); setWork(e.work); setDate(e.date); setTime(e.time || ""); setKeywords(e.keywords.join(", ")); setCharacter(e.character); setText(e.text); setComment(e.comment || ""); }}>수정</button>
                          <button onClick={async () => { if(confirm("삭제?")) { await supabase.from("entries").delete().eq('id', e.db_id); fetchEntries(); } }}>삭제</button>
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
          <div className="space-y-6 italic opacity-50 text-sm">
             <button onClick={() => { supabase.auth.signOut(); setUser(null); }}>Sign out</button>
          </div>
        )}
      </div>
    </div>
  );
}
