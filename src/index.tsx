import React, { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom/client";
import { createClient } from "@supabase/supabase-js";

// ⚠️ Supabase 주소와 키를 본인 것으로 꼭 확인하세요!
const supabase = createClient(
  "https://dctinbgpmxsfyexnfvbi.supabase.co", 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdGluYmdwbXhzZnlleG5mdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDU4NDQsImV4cCI6MjA4NDU4MTg0NH0.SPiNc-q-u6xHlb5H82EFvl8xBUmzuCIs8w6WS9tauyY"
);

function App() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [entries, setEntries] = useState<any[]>([]);
  const [mode, setMode] = useState<"write" | "archive" | "style">("write");

  // --- [원래 기능] 데이터 상태들 ---
  const [work, setWork] = useState("");
  const [character, setCharacter] = useState("");
  const [text, setText] = useState("");
  const [comment, setComment] = useState("");
  const [keywords, setKeywords] = useState("");
  
  // --- [원래 기능] 스타일 상태들 ---
  const [bgColor, setBgColor] = useState("#f5f5f2");
  const [textColor, setTextColor] = useState("#3a3a3a");
  const [fontFamily, setFontFamily] = useState("serif");
  const [night, setNight] = useState(false);

  // --- [원래 기능] 필터 상태들 ---
  const [query, setQuery] = useState("");
  const [charFilter, setCharFilter] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchEntries();
    });
  }, []);

  const fetchEntries = async () => {
    const { data } = await supabase.from("entries").select("*").order('created_at', { ascending: false });
    if (data) setEntries(data.map(d => ({ ...d.content, id: d.id })));
  };

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("로그인 정보를 확인해주세요.");
    else { setUser(data.user); fetchEntries(); }
  };

  const handleSave = async () => {
    if (!work || !text) return alert("작품명과 문장을 입력해주세요.");
    const payload = { 
      work, character, text, comment, 
      keywords: keywords.split(",").map(k => k.trim()).filter(Boolean),
      date: new Date().toLocaleDateString() 
    };
    const { error } = await supabase.from("entries").insert([{ content: payload, user_id: user.id }]);
    if (!error) {
      setWork(""); setCharacter(""); setText(""); setComment(""); setKeywords("");
      fetchEntries(); alert("서버에 안전하게 저장되었습니다.");
    }
  };

  // 필터링 로직
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const matchQuery = !query || e.text.includes(query) || e.work.includes(query);
      const matchChar = !charFilter || e.character === charFilter;
      return matchQuery && matchChar;
    });
  }, [entries, query, charFilter]);

  const characters = useMemo(() => Array.from(new Set(entries.map(e => e.character))).filter(Boolean), [entries]);

  const activeBg = night ? "#1a1a1a" : bgColor;
  const activeText = night ? "#e0e0e0" : textColor;

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f5f5f2" }}>
        <div style={{ padding: "40px", backgroundColor: "white", borderRadius: "30px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)", textAlign: "center", width: "320px" }}>
          <h1 style={{ marginBottom: "30px", fontStyle: "italic" }}>ARCHIVE</h1>
          <input type="email" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "10px", border: "1px solid #eee" }} />
          <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "10px", border: "1px solid #eee" }} />
          <button onClick={handleLogin} style={{ width: "100%", padding: "12px", backgroundColor: "#333", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold" }}>로그인</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: activeBg, color: activeText, fontFamily, padding: "20px", transition: "0.3s" }}>
      <header style={{ maxWidth: "600px", margin: "0 auto", display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(0,0,0,0.1)", paddingBottom: "10px" }}>
        <h1 style={{ fontStyle: "italic", fontSize: "24px" }}>ARCHIVE</h1>
        <div style={{ display: "flex", gap: "15px", fontSize: "14px" }}>
          <button onClick={() => setMode("write")} style={{ opacity: mode === "write" ? 1 : 0.3, background: "none", border: "none", fontWeight: "bold" }}>WRITE</button>
          <button onClick={() => setMode("archive")} style={{ opacity: mode === "archive" ? 1 : 0.3, background: "none", border: "none", fontWeight: "bold" }}>LIST</button>
          <button onClick={() => setMode("style")} style={{ opacity: mode === "style" ? 1 : 0.3, background: "none", border: "none", fontWeight: "bold" }}>STYLE</button>
        </div>
      </header>

      <main style={{ maxWidth: "600px", margin: "20px auto" }}>
        {mode === "write" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input placeholder="작품명" value={work} onChange={e => setWork(e.target.value)} style={{ padding: "15px", background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "10px" }} />
            <input placeholder="캐릭터 (선택)" value={character} onChange={e => setCharacter(e.target.value)} style={{ padding: "15px", background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "10px" }} />
            <textarea placeholder="문장을 적어주세요" value={text} onChange={e => setText(e.target.value)} style={{ padding: "15px", minHeight: "200px", borderRadius: "10px", border: "none" }} />
            <textarea placeholder="나의 감상 (선택)" value={comment} onChange={e => setComment(e.target.value)} style={{ padding: "15px", minHeight: "100px", borderRadius: "10px", border: "none", fontSize: "14px" }} />
            <button onClick={handleSave} style={{ padding: "20px", backgroundColor: "#333", color: "white", borderRadius: "15px", fontWeight: "bold", border: "none" }}>기록 저장</button>
          </div>
        )}

        {mode === "archive" && (
          <div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              <input placeholder="검색어 입력..." value={query} onChange={e => setQuery(e.target.value)} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none" }} />
              <select onChange={(e) => setCharFilter(e.target.value)} style={{ padding: "10px", borderRadius: "10px" }}>
                <option value="">모든 캐릭터</option>
                {characters.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {filteredEntries.map(e => (
              <div key={e.id} style={{ padding: "20px", backgroundColor: "white", borderRadius: "20px", marginBottom: "15px", color: "#333" }}>
                <p style={{ fontSize: "17px", marginBottom: "10px" }}>"{e.text}"</p>
                {e.comment && <p style={{ fontSize: "13px", color: "#666", borderLeft: "2px solid #ddd", paddingLeft: "10px", marginBottom: "10px" }}>{e.comment}</p>}
                <div style={{ fontSize: "11px", opacity: 0.5 }}>{e.work} {e.character && `· ${e.character}`} · {e.date}</div>
              </div>
            ))}
          </div>
        )}

        {mode === "style" && (
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <label>배경색: <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} /></label>
            <label>글자색: <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} /></label>
            <button onClick={() => setNight(!night)} style={{ padding: "15px" }}>{night ? "데이 모드" : "나이트 모드"}</button>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setFontFamily("serif")}>명조체</button>
              <button onClick={() => setFontFamily("sans-serif")}>고딕체</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
