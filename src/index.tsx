import { useMemo, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ⚠️ 본인의 Supabase URL과 API KEY를 정확히 넣어주세요
const supabase = createClient(
  "https://dctinbgpmxsfyexnfvbi.supabase.co", 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdGluYmdwbXhzZnlleG5mdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDU4NDQsImV4cCI6MjA4NDU4MTg0NH0.SPiNc-q-u6xHlb5H82EFvl8xBUmzuCIs8w6WS9tauyY"
);

export default function App() {
  // --- [시스템 상태] ---
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // --- [로그인 입력 상태] ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // --- [원본 디자인/기능 상태 변수 (건드리지 않음)] ---
  const [entries, setEntries] = useState<any[]>([]);
  const [mode, setMode] = useState<"write" | "archive" | "style">("write");
  const [openWork, setOpenWork] = useState<string | null>(null);
  const [openEntryId, setOpenEntryId] = useState<number | null>(null);
  const [focusEntry, setFocusEntry] = useState<any | null>(null);

  const [bgColor, setBgColor] = useState("#f5f5f2");
  const [textColor, setTextColor] = useState("#3a3a3a");
  const [koreanFont, setKoreanFont] = useState("BookkMyungjo");
  const [fontLink, setFontLink] = useState(""); // 폰트 링크 기능 복구
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

  // --- [1. 데이터 불러오기 로직] ---
  useEffect(() => {
    // 세션 체크
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchData();
      setLoading(false);
    });

    // 스타일 로컬 스토리지에서 복구 (새로고침해도 스타일 유지되도록)
    const savedStyle = localStorage.getItem("archive_style");
    if (savedStyle) {
      const parsed = JSON.parse(savedStyle);
      setBgColor(parsed.bgColor);
      setTextColor(parsed.textColor);
      setLineSize(parsed.lineSize);
      setNight(parsed.night);
    }
  }, []);

  const fetchData = async () => {
    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .order('created_at', { ascending: false }); // 최신순 정렬

    if (data) {
      // DB 데이터를 앱에서 사용하는 형태로 변환
      const formatted = data.map(d => ({
        ...d.content,  // JSON 내용 풀기
        db_id: d.id,   // DB의 진짜 ID (삭제/수정용)
        id: d.content.id || d.id // 리액트용 ID
      }));
      setEntries(formatted);
    }
  };

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("로그인 정보가 맞지 않습니다.");
    else { setUser(data.user); fetchData(); }
  };

  // --- [2. 저장 / 수정 / 삭제 로직] ---
  const save = async () => {
    if (!work || !date || !text) return;
    
    // 저장할 데이터 뭉치
    const payload = { 
      work, date, time, character, text, comment, 
      keywords: keywords.split(",").map(k => k.trim()).filter(Boolean),
      id: editingId || Date.now(), // 수정이면 기존 ID, 아니면 새 ID
      favorite: false 
    };

    if (editingId) {
      // 수정
      const target = entries.find(e => e.id === editingId);
      // 기존 favorite 상태 유지
      payload.favorite = target.favorite;
      
      await supabase.from("entries")
        .update({ content: payload })
        .eq('id', target.db_id);
      
      setEditingId(null);
    } else {
      // 신규 저장
      await supabase.from("entries")
        .insert([{ content: payload, user_id: user.id }]);
    }

    // 입력창 초기화
    setWork(""); setDate(""); setTime(""); setKeywords(""); setCharacter(""); setText(""); setComment("");
    // 목록 새로고침
    fetchData();
  };

  const deleteEntry = async (db_id: any) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      await supabase.from("entries").delete().eq('id', db_id);
      fetchData();
    }
  };

  const toggleFavorite = async (entry: any) => {
    const newStatus = !entry.favorite;
    const updatedContent = { ...entry, favorite: newStatus };
    // DB에서 content 컬럼 전체를 업데이트
    await supabase.from("entries")
      .update({ content: updatedContent })
      .eq('id', entry.db_id);
    fetchData();
  };

  // --- [3. 스타일 저장 로직 (로컬 스토리지)] ---
  // 스타일이 바뀔 때마다 로컬에 저장해서 새로고침해도 안 날아가게 함
  useEffect(() => {
    localStorage.setItem("archive_style", JSON.stringify({ bgColor, textColor, lineSize, night }));
  }, [bgColor, textColor, lineSize, night]);


  // --- [화면 렌더링 로직 (원본 디자인 100%)] ---
  const works = useMemo(() => Array.from(new Set(entries.map((e) => e.work))).filter(Boolean), [entries]);
  const characters = useMemo(() => Array.from(new Set(entries.map((e) => e.character))).filter(Boolean), [entries]);

  const filtered = useMemo(() => {
    let base = [...entries];
    // 정렬 (날짜순 -> 시간순)
    base.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || "").localeCompare(b.time || "");
    });

    if (onlyFavorite) base = base.filter((e) => e.favorite);
    if (charFilter) base = base.filter((e) => e.character === charFilter);
    if (!query) return base;
    
    const q = query.toLowerCase();
    return base.filter((e) => 
      [e.text, e.comment, e.character, e.keywords.join(" ")]
      .some((v) => v?.toLowerCase().includes(q))
    );
  }, [entries, query, onlyFavorite, charFilter]);

  const grouped = useMemo(() => filtered.reduce((acc: any, cur) => {
    acc[cur.work] = acc[cur.work] || [];
    acc[cur.work].push(cur);
    return acc;
  }, {}), [filtered]);

  const activeBg = night ? "#141414" : bgColor;
  const activeText = night ? "#e5e5e5" : textColor;

  // 로딩 중일 때 깜빡임 방지
  if (loading) return <div className="min-h-screen bg-[#f5f5f2]" />;

  // [로그인 화면] - 디자인 톤 앤 매너 맞춤
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor, color: textColor, fontFamily: koreanFont }}>
        <div className="space-y-6 text-center">
          <h1 className="text-3xl font-serif tracking-widest">ARCHIVE</h1>
          <div className="flex flex-col gap-3">
            <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="border-b bg-transparent px-2 py-2 outline-none text-center" style={{ borderColor: textColor }} />
            <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} className="border-b bg-transparent px-2 py-2 outline-none text-center" style={{ borderColor: textColor }} />
          </div>
          <button onClick={handleLogin} className="px-6 py-2 border rounded-full text-xs opacity-50 hover:opacity-100 transition-opacity" style={{ borderColor: textColor }}>ENTER</button>
        </div>
      </div>
    );
  }

  // [집중 모드 (팝업)]
  if (focusEntry) {
    return (
      <div onClick={() => setFocusEntry(null)} className="fixed inset-0 z-50 flex items-center justify-center px-6 cursor-pointer" style={{ background: activeBg, color: activeText, fontFamily: koreanFont }}>
        <div className="text-center space-y-6 max-w-2xl animate-in fade-in zoom-in duration-300">
          <div className="whitespace-pre-wrap leading-relaxed" style={{ fontSize: Math.max(16, lineSize + 4) }}>{focusEntry.text}</div>
          <div className="text-xs opacity-50 flex justify-center gap-2">
            <span>{focusEntry.work}</span>
            <span>·</span>
            <span>{focusEntry.character}</span>
          </div>
        </div>
      </div>
    );
  }

  // [메인 화면]
  return (
    <div className="min-h-screen px-5 py-8 transition-colors duration-500 ease-in-out" style={{ backgroundColor: activeBg, color: activeText, fontFamily: koreanFont }}>
      <style>{`
        @font-face { font-family: 'BookkMyungjo'; src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/BookkMyungjo-Lt.woff2') format('woff2'); font-weight: 400; }
        @font-face { font-family: 'BookkMyungjo'; src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/BookkMyungjo-Bd.woff2') format('woff2'); font-weight: 700; }
        input::placeholder, textarea::placeholder { color: inherit; opacity: 0.3; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
      {fontLink && <link rel="stylesheet" href={fontLink} />}

      <div className="max-w-4xl mx-auto space-y-12">
        {/* 헤더 */}
        <header className="flex justify-between items-baseline">
          <h1 className="text-4xl font-serif italic tracking-tighter cursor-pointer" onClick={()=>setMode("write")}>Archive</h1>
          <nav className="flex gap-6 text-sm font-serif italic">
            <button onClick={() => setMode("write")} className={`transition-opacity ${mode === "write" ? "opacity-100 font-bold border-b border-current" : "opacity-40"}`}>Write</button>
            <button onClick={() => setMode("archive")} className={`transition-opacity ${mode === "archive" ? "opacity-100 font-bold border-b border-current" : "opacity-40"}`}>Read</button>
            <button onClick={() => setMode("style")} className={`transition-opacity ${mode === "style" ? "opacity-100 font-bold border-b border-current" : "opacity-40"}`}>Set</button>
          </nav>
        </header>

        {/* 쓰기 모드 */}
        {mode === "write" && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-1">
              <input list="works" placeholder="작품 제목" value={work} onChange={(e) => setWork(e.target.value)} className="w-full px-2 py-2 text-xl bg-transparent border-b-2 border-current/10 focus:border-current outline-none font-serif font-bold placeholder:italic" />
              <datalist id="works">{works.map((w) => <option key={w} value={w} />)}</datalist>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <input placeholder="Date / Page" value={date} onChange={(e) => setDate(e.target.value)} className="border-b border-current/10 focus:border-current bg-transparent px-2 py-2 outline-none text-sm font-serif" />
              <input placeholder="Time" value={time} onChange={(e) => setTime(e.target.value)} className="border-b border-current/10 focus:border-current bg-transparent px-2 py-2 outline-none text-sm font-serif" />
              <input placeholder="Keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} className="border-b border-current/10 focus:border-current bg-transparent px-2 py-2 outline-none text-sm font-serif" />
              <div className="relative">
                <input list="chars" placeholder="Character" value={character} onChange={(e) => setCharacter(e.target.value)} className="w-full border-b border-current/10 focus:border-current bg-transparent px-2 py-2 outline-none text-sm font-bold font-serif" />
                <datalist id="chars">{characters.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
            </div>

            <div className="pt-4">
              <textarea placeholder="기록하고 싶은 문장을 입력하세요." value={text} onChange={(e) => setText(e.target.value)} className="w-full min-h-[200px] px-4 py-4 bg-current/5 rounded-sm border-none leading-loose whitespace-pre-wrap outline-none resize-none placeholder:italic" style={{ fontSize: lineSize }} />
            </div>

            <div className="flex items-start gap-4">
               <textarea placeholder="짧은 코멘트나 메모 (선택)" value={comment} onChange={(e) => setComment(e.target.value)} className="flex-1 px-2 py-2 bg-transparent border-b border-current/10 text-sm opacity-70 focus:opacity-100 outline-none resize-none h-10" />
            </div>

            <div className="flex justify-end pt-4">
              <button onClick={save} className="px-8 py-3 bg-current text-xs font-bold tracking-widest rounded-full hover:opacity-80 transition-opacity" style={{ color: activeBg }}>
                SAVE RECORD
              </button>
            </div>
          </div>
        )}

        {/* 읽기(아카이브) 모드 */}
        {mode === "archive" && (
          <div className="space-y-10 animate-in fade-in duration-500">
            {/* 검색 및 필터 바 */}
            <div className="flex flex-wrap gap-4 items-center pb-4 border-b border-current/10">
              <input placeholder="Search in archive..." value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 min-w-[200px] bg-transparent outline-none italic placeholder:opacity-40" />
              
              <select value={charFilter} onChange={(e) => setCharFilter(e.target.value)} className="bg-transparent outline-none text-sm opacity-60 cursor-pointer hover:opacity-100">
                <option value="">All Characters</option>
                {characters.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              
              <button onClick={() => setOnlyFavorite((v) => !v)} className={`text-lg transition-colors ${onlyFavorite ? "opacity-100" : "opacity-20 hover:opacity-60"}`}>
                ★
              </button>
            </div>

            {/* 리스트 출력 */}
            {Object.keys(grouped).length === 0 ? (
              <div className="text-center py-20 opacity-30 italic">No records found.</div>
            ) : (
              Object.entries(grouped).map(([title, list]: any) => (
                <section key={title} className="space-y-4">
                  <button onClick={() => setOpenWork(openWork === title ? null : title)} className="flex items-baseline gap-3 w-full text-left group">
                    <h2 className="text-xl font-serif font-bold italic opacity-80 group-hover:opacity-100 transition-opacity">{title}</h2>
                    <span className="text-xs opacity-30 font-serif">{list.length}</span>
                  </button>
                  
                  <div className={`space-y-6 transition-all duration-300 ${openWork === title ? "block" : "hidden"}`}>
                    {list.map((e: any) => (
                      <div key={e.id} className="pl-4 border-l border-current/10 space-y-2">
                        <div onClick={() => setOpenEntryId(openEntryId === e.id ? null : e.id)} className="cursor-pointer group">
                           <div className="flex justify-between items-baseline mb-1">
                             <span className="text-xs opacity-40 font-serif tracking-wide">{e.date} {e.time && `· ${e.time}`} · {e.character}</span>
                             {e.favorite && <span className="text-[10px]">★</span>}
                           </div>
                           <p className={`line-clamp-2 leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity ${openEntryId === e.id ? "line-clamp-none" : ""}`} style={{ fontSize: openEntryId === e.id ? lineSize : 14 }}>
                             {e.text}
                           </p>
                        </div>

                        {/* 상세 메뉴 (클릭 시 확장) */}
                        {openEntryId === e.id && (
                          <div className="pt-3 flex gap-4 text-[10px] tracking-widest uppercase opacity-40 animate-in slide-in-from-top-2">
                            <button onClick={() => setFocusEntry(e)} className="hover:opacity-100 hover:underline">View Full</button>
                            <button onClick={() => { setMode("write"); setEditingId(e.id); setWork(e.work); setDate(e.date); setTime(e.time || ""); setKeywords(e.keywords.join(", ")); setCharacter(e.character); setText(e.text); setComment(e.comment || ""); }} className="hover:opacity-100 hover:underline">Edit</button>
                            <button onClick={() => toggleFavorite(e)} className="hover:opacity-100 hover:underline">{e.favorite ? "Unstar" : "Star"}</button>
                            <button onClick={() => deleteEntry(e.db_id)} className="hover:text-red-500 hover:opacity-100 hover:underline">Delete</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        )}

        {/* 설정 모드 */}
        {mode === "style" && (
          <div className="max-w-md mx-auto space-y-10 py-10 animate-in fade-in">
             <div className="space-y-4">
               <h3 className="text-xs uppercase tracking-[0.2em] opacity-40 border-b border-current/10 pb-2">Appearance</h3>
               <div className="flex items-center justify-between">
                 <span className="text-sm">Night Mode</span>
                 <button onClick={() => setNight(!night)} className="text-xs border px-3 py-1 rounded-full opacity-60 hover:opacity-100">{night ? "ON" : "OFF"}</button>
               </div>
               <div className="space-y-2">
                 <span className="text-sm block">Background Color</span>
                 <div className="flex gap-2">
                    {["#f5f5f2", "#ffffff", "#e3e3e3", "#f0e6d2"].map(c => (
                      <button key={c} onClick={()=>setBgColor(c)} className="w-6 h-6 rounded-full border border-black/10" style={{background:c}} />
                    ))}
                    <input type="color" value={bgColor} onChange={(e)=>setBgColor(e.target.value)} className="w-6 h-6 overflow-hidden rounded-full border-none" />
                 </div>
               </div>
             </div>

             <div className="space-y-4">
               <h3 className="text-xs uppercase tracking-[0.2em] opacity-40 border-b border-current/10 pb-2">Typography</h3>
               <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                   <span>Font Size</span>
                   <span>{lineSize}px</span>
                 </div>
                 <input type="range" min="12" max="24" value={lineSize} onChange={(e) => setLineSize(Number(e.target.value))} className="w-full accent-current h-1 bg-current/10 rounded-lg appearance-none cursor-pointer" />
               </div>
               <div className="space-y-2 pt-2">
                 <span className="text-sm block">Web Font URL</span>
                 <input placeholder="CSS Link (Optional)" value={fontLink} onChange={(e)=>setFontLink(e.target.value)} className="w-full text-xs border-b border-current/20 bg-transparent py-1 outline-none" />
               </div>
             </div>

             <div className="pt-10 border-t border-current/10 text-center">
               <button onClick={() => { supabase.auth.signOut(); setUser(null); }} className="text-xs opacity-30 hover:opacity-100 hover:text-red-500 transition-all">
                 LOGOUT
               </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
