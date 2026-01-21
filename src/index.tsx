import React, { useMemo, useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { createClient } from "@supabase/supabase-js";

// ⚠️ 여기에 본인의 정보를 꼭 입력해야 작동합니다! 빈값이면 오류가 날 수 있습니다.
const SUPABASE_URL = "https://dctinbgpmxsfyexnfvbi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdGluYmdwbXhzZnlleG5mdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDU4NDQsImV4cCI6MjA4NDU4MTg0NH0.SPiNc-q-u6xHlb5H82EFvl8xBUmzuCIs8w6WS9tauyY";

// 에러 방지를 위한 클라이언트 생성 로직
const supabase = (SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== "여기에_본인의_ANON_KEY_입력") 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

export default function App() {
  // --- 원본 상태 100% 복구 ---
  const [entries, setEntries] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [mode, setMode] = useState<"write" | "archive" | "style">("write");
  const [openWork, setOpenWork] = useState<string | null>(null);
  const [openEntryId, setOpenEntryId] = useState<number | null>(null);
  const [focusEntry, setFocusEntry] = useState<any | null>(null);

  const [bgColor, setBgColor] = useState("#f5f5f2");
  const [textColor, setTextColor] = useState("#3a3a3a");
  const [koreanFont, setKoreanFont] = useState("BookkMyungjo");
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

  // --- 데이터 불러오기 ---
  useEffect(() => {
    if (!supabase) {
      // 키가 없을 경우 로컬 데이터로 대체 (테스트용)
      const saved = localStorage.getItem("archive_backup");
      if (saved) setEntries(JSON.parse(saved));
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchEntries();
    });
  }, []);

  const fetchEntries = async () => {
    if (!supabase) return;
    const { data } = await supabase.from("entries").select("*");
    if (data) setEntries(data.map(d => ({ ...d.content, db_id: d.id, id: d.content.id || d.id })));
  };

  const save = async () => {
    if (!work || !date || !text) return;
    const payload = { work, date, time, character, text, comment, id: editingId || Date.now(), favorite: false };

    if (!supabase || !user) {
      // 로그인 안 되었을 때 임시 저장
      const newEntries = [...entries, payload];
      setEntries(newEntries);
      localStorage.setItem("archive_backup", JSON.stringify(newEntries));
    } else {
      await supabase.from("entries").insert([{ content: payload, user_id: user.id }]);
      fetchEntries();
    }
    setWork(""); setDate(""); setText("");
  };

  const activeBg = night ? "#141414" : bgColor;
  const activeText = night ? "#e5e5e5" : textColor;

  // --- 렌더링 ---
  return (
    <div style={{ backgroundColor: activeBg, color: activeText, minHeight: "100vh", padding: "24px", fontFamily: koreanFont }}>
      {/* Tailwind가 안 먹힐 때를 대비한 인라인 스타일 포함 */}
      <style>{`
        @font-face { font-family: 'BookkMyungjo'; src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/BookkMyungjo-Lt.woff2') format('woff2'); }
        body { margin: 0; }
        .container { max-width: 800px; margin: 0 auto; }
        .nav { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .input-line { width: 100%; background: transparent; border: none; border-bottom: 1px solid rgba(0,0,0,0.1); padding: 8px 0; margin-bottom: 16px; outline: none; color: inherit; font-size: 16px; }
        .save-btn { padding: 8px 20px; border: 1px solid rgba(0,0,0,0.2); border-radius: 20px; background: transparent; cursor: pointer; color: inherit; }
      `}</style>

      <div className="container">
        <header className="nav">
          <h1 style={{ fontSize: "24px", fontFamily: "serif" }}>ARCHIVE</h1>
          <div style={{ display: "flex", gap: "20px", fontSize: "14px" }}>
            <button onClick={() => setMode("write")} style={{ opacity: mode === "write" ? 1 : 0.4, background: "none", border: "none", color: "inherit" }}>Write</button>
            <button onClick={() => setMode("archive")} style={{ opacity: mode === "archive" ? 1 : 0.4, background: "none", border: "none", color: "inherit" }}>Archive</button>
          </div>
        </header>

        {mode === "write" && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <input placeholder="작품명" value={work} onChange={e => setWork(e.target.value)} className="input-line" style={{ fontWeight: "bold" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <input placeholder="날짜" value={date} onChange={e => setDate(e.target.value)} className="input-line" />
              <input placeholder="캐릭터" value={character} onChange={e => setCharacter(e.target.value)} className="input-line" />
            </div>
            <textarea placeholder="문장을 기록하세요" value={text} onChange={e => setText(e.target.value)} className="input-line" style={{ height: "150px", border: "none", resize: "none" }} />
            <div>
              <button onClick={save} className="save-btn">저장하기</button>
            </div>
          </div>
        )}

        {mode === "archive" && (
          <div className="animate-in fade-in">
            {entries.length === 0 ? (
              <p style={{ opacity: 0.5 }}>아직 기록이 없습니다.</p>
            ) : (
              entries.map(e => (
                <div key={e.id} style={{ marginBottom: "20px", borderBottom: "1px solid rgba(0,0,0,0.05)", paddingBottom: "10px" }}>
                  <p style={{ fontSize: "18px", lineHeight: "1.6" }}>{e.text}</p>
                  <p style={{ fontSize: "12px", opacity: 0.4 }}>{e.work} · {e.character}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
