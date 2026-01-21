import React, { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom/client";
import { createClient } from "@supabase/supabase-js";

// ⚠️ 본인의 정보로 다시 채워주세요!
const supabase = createClient(
  "https://dctinbgpmxsfyexnfvbi.supabase.co", 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdGluYmdwbXhzZnlleG5mdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDU4NDQsImV4cCI6MjA4NDU4MTg0NH0.SPiNc-q-u6xHlb5H82EFvl8xBUmzuCIs8w6WS9tauyY"
);

function App() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [entries, setEntries] = useState<any[]>([]);
  const [mode, setMode] = useState<"write" | "archive">("write");
  const [work, setWork] = useState("");
  const [text, setText] = useState("");

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
    if (error) alert("로그인 실패!");
    else { setUser(data.user); fetchEntries(); }
  };

  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("가입 확인 메일이 발송되었습니다!");
  };

  const handleSave = async () => {
    if (!work || !text) return alert("내용을 입력해주세요.");
    const payload = { work, text, date: new Date().toLocaleDateString() };
    const { error } = await supabase.from("entries").insert([{ content: payload, user_id: user.id }]);
    if (!error) { setWork(""); setText(""); fetchEntries(); alert("저장 완료!"); }
  };

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f5f5f2", padding: "20px" }}>
        <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "20px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", width: "100%", maxWidth: "350px" }}>
          <h2 style={{ textAlign: "center", marginBottom: "20px" }}>아카이브 로그인</h2>
          <input type="email" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
          <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)} style={{ width: "100%", padding: "10px", marginBottom: "20px" }} />
          <button onClick={handleLogin} style={{ width: "100%", padding: "12px", backgroundColor: "black", color: "white", border: "none", borderRadius: "10px", cursor: "pointer" }}>로그인</button>
          <button onClick={handleSignUp} style={{ width: "100%", marginTop: "10px", fontSize: "12px", color: "gray", background: "none", border: "none" }}>회원가입</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "0 auto" }}>
      <header style={{ display: "flex", justifyStretch: "space-between", marginBottom: "20px" }}>
        <h1>ARCHIVE</h1>
        <button onClick={() => { supabase.auth.signOut(); setUser(null); }}>Logout</button>
      </header>
      <nav style={{ marginBottom: "20px" }}>
        <button onClick={() => setMode("write")}>쓰기</button>
        <button onClick={() => setMode("archive")}>목록</button>
      </nav>
      {mode === "write" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <input placeholder="작품명" value={work} onChange={e => setWork(e.target.value)} style={{ padding: "10px" }} />
          <textarea placeholder="문장" value={text} onChange={e => setText(e.target.value)} style={{ padding: "10px", minHeight: "200px" }} />
          <button onClick={handleSave} style={{ padding: "15px", backgroundColor: "#333", color: "white", border: "none" }}>저장</button>
        </div>
      ) : (
        <div>
          {entries.map(e => (
            <div key={e.id} style={{ padding: "15px", borderBottom: "1px solid #ddd" }}>
              <p>{e.text}</p>
              <small>{e.work} - {e.date}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ⚠️ 이 부분이 없어서 에러가 났던 거예요!
const rootElement = document.getElementById("root");
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
