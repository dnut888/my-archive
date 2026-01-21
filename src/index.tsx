import React, { useMemo, useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import jsPDF from "jspdf";

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

  // 백업 기능
  const handleBackup = (format: "txt"|"html"|"json"|"pdf") => {
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
      case "pdf":
        const doc = new jsPDF();
        let y = 10;
        entries.forEach((e,i)=>{
          doc.text(`${e.work} / ${e.character} / ${e.date} ${e.time||""}`,10,y);
          y+=7;
          doc.text(e.text,10,y);
          y+=10;
          if(y>280){ doc.addPage(); y=10;}
        });
        doc.save(filename+".pdf");
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

  return (
    <div className="min-h-screen px-5 py-6" style={{backgroundColor:activeBg,color:activeText,fontFamily:webFont}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400&display=swap');
        @font-face { font-family: 'BookkMyungjo'; src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/BookkMyungjo-Lt.woff2') format('woff2'); }
        *{letter-spacing:0px !important;}
        .font-en{font-family:'Crimson Text', serif !important;}
      `}</style>

      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-current/10 pb-4">
          <h1 className="text-3xl tracking-tighter cursor-pointer font-en" onClick={()=>setMode("write")}>Archive</h1>
          <nav className="flex gap-4 text-xs font-en uppercase tracking-widest">
            <button onClick={()=>setMode("write")} className={mode==="write"?"":"opacity-30"}>Write</button>
            <button onClick={()=>setMode("archive")} className={mode==="archive"?"":"opacity-30"}>Read</button>
            <button onClick={()=>setMode("style")} className={mode==="style"?"":"opacity-30"}>Set</button>
          </nav>
        </header>

        {mode==="write" && (
          <div className="space-y-4">
            <input placeholder="작품명" value={work} onChange={e=>setWork(e.target.value)} list="workHistory" className="w-full py-3 border-b bg-transparent font-bold text-xl outline-none"/>
            <datalist id="workHistory">{workHistory.map(w=><option key={w} value={w}/>)}</datalist>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <input placeholder="날짜" value={date} onChange={e=>setDate(e.target.value)} className="border-b bg-transparent py-2 outline-none text-sm"/>
              <input placeholder="시간" value={time} onChange={e=>setTime(e.target.value)} className="border-b bg-transparent py-2 outline-none text-sm"/>
              <input placeholder="키워드" value={keywords} onChange={e=>setKeywords(e.target.value)} className="border-b bg-transparent py-2 outline-none text-sm"/>
              <input placeholder="캐릭터" value={character} onChange={e=>setCharacter(e.target.value)} list="characterHistory" className="border-b bg-transparent py-2 outline-none text-sm font-bold"/>
              <datalist id="characterHistory">{characterHistory.map(c=><option key={c} value={c}/>)}</datalist>
            </div>

            <textarea placeholder="문장을 입력하세요" value={text} onChange={e=>setText(e.target.value)} className="w-full h-64 py-3 bg-transparent leading-relaxed outline-none resize-none" style={{fontSize:'14px'}}/>

            <button onClick={()=>setShowComment(!showComment)} className="text-xs underline opacity-50">{showComment?"코멘트 접기":"코멘트 펼치기"}</button>
            {showComment && <textarea placeholder="코멘트" value={comment} onChange={e=>setComment(e.target.value)} className="w-full py-2 bg-transparent text-xs opacity-70 outline-none"/>}

            <div className="flex justify-end gap-2 pt-4">
              <button onClick={save} className="px-12 py-3 border border-current rounded-full text-xs font-en uppercase tracking-widest">Save</button>
              <button onClick={()=>handleBackup("txt")} className="px-3 py-2 border rounded text-xs">TXT</button>
              <button onClick={()=>handleBackup("html")} className="px-3 py-2 border rounded text-xs">HTML</button>
              <button onClick={()=>handleBackup("json")} className="px-3 py-2 border rounded text-xs">JSON</button>
              <button onClick={()=>handleBackup("pdf")} className="px-3 py-2 border rounded text-xs">PDF</button>
            </div>
          </div>
        )}

        {mode==="archive" && (
          <div className="space-y-4">
            <div className="flex gap-3 border-b border-current/5 pb-2">
              <input placeholder="Search..." value={query} onChange={e=>setQuery(e.target.value)} className="flex-1 bg-transparent py-1 outline-none text-sm"/>
              <button onClick={()=>setOnlyFavorite(!onlyFavorite)} className={onlyFavorite?"text-yellow-500":"opacity-20"}>★</button>
            </div>
            {Object.entries(grouped).map(([title,list]:any)=>(
              <section key={title} className="space-y-1">
                <button onClick={()=>setOpenWork(openWork===title?null:title)} className="flex items-baseline gap-2 font-bold border-b border-current/5 w-full text-left py-1">
                  <span>{title}</span><span className="text-[10px] opacity-40 font-en">({list.length})</span>
                </button>
                {openWork===title && list.map((e:any)=>(
                  <div key={e.id} className="ml-1 pl-4 py-2 border-b border-current/[0.03]">
                    <button onClick={()=>setOpenEntryId(openEntryId===e.id?null:e.id)} className="w-full text-left text-[11px] opacity-70">
                      {e.date} {e.time||""} {e.character && `· ${e.character}`}
                    </button>
                    {openEntryId===e.id && (
                      <div className="pt-3">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 leading-relaxed cursor-pointer" onClick={()=>setFocusEntry(e)} style={{fontSize:lineSize}}>{e.text}</div>
                          <button onClick={()=>{ const n={...e,favorite:!e.favorite}; setEntries(prev=>prev.map(x=>x.id===e.id?n:x)); }} className={e.favorite?"text-yellow-500":"opacity-20"}>★</button>
                        </div>
                        {e.comment && <button onClick={()=>e.showComment=!e.showComment} className="text-xs underline opacity-50 mt-1">{e.showComment?"코멘트 접기":"코멘트 펼치기"}</button>}
                        {e.showComment && <div className="text-xs opacity-50 mt-1">{e.comment}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}

        {mode==="style" && (
          <div className="space-y-6 max-w-sm">
            <div className="space-y-1 font-en">
              <label className="text-[10px] uppercase font-bold opacity-50">Colors</label>
              <input value={bgColor} onChange={e=>{setBgColor(e.target.value); localStorage.setItem("arch_bg",e.target.value)}} className="w-full bg-transparent border-b border-current/20 py-1 outline-none text-xs"/>
              <input value={textColor} onChange={e=>{setTextColor(e.target.value); localStorage.setItem("arch_text",e.target.value)}} className="w-full bg-transparent border-b border-current/20 py-1 outline-none text-xs"/>
              <input placeholder="웹폰트 URL" value={webFont} onChange={e=>{setWebFont(e.target.value); localStorage.setItem("arch_font",e.target.value)}} className="w-full bg-transparent border-b border-current/20 py-1 outline-none text-xs"/>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-current/10 font-en">
              <span className="text-xs font-bold uppercase">Night Mode</span>
              <button onClick={()=>{setNight(!night); localStorage.setItem("arch_night",(!night).toString())}} className={`w-10 h-5 rounded-full relative ${night?'bg-blue-500':'bg-gray-300'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${night?'left-6':'left-1'}`}/>
              </button>
            </div>
            <button onClick={()=>{ supabase.auth.signOut(); setUser(null); }} className="text-[10px] font-en uppercase font-bold opacity-40 border border-current/20 px-2 py-1 rounded">Logout</button>
          </div>
        )}
      </div>

      {focusEntry && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-10 bg-black/50" onClick={()=>setFocusEntry(null)}>
          <div className="max-w-2xl w-full space-y-12 text-center" style={{color:activeText, fontFamily:webFont}}>
            <div className="leading-relaxed whitespace-pre-wrap text-left" style={{fontSize:lineSize+6}}>{focusEntry.text}</div>
            <div className="text-sm opacity-50 font-en tracking-tight uppercase">
              {focusEntry.work} · {focusEntry.date} {focusEntry.time||""} {focusEntry.character && `· ${focusEntry.character}`}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
