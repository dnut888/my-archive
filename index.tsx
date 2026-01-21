import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { createClient } from "@supabase/supabase-js";

// ⚠️ 본인의 Supabase 정보로 꼭 바꿔주세요!
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
    if (error) alert("로그인 실패: " + error.message);
    else { setUser(data.user); fetchEntries(); }
  };

  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("인증 메일을 확인해주세요!");
  };

  const handleSave = async () => {
    if (!work || !text) return alert("내용 입력!");
    const payload = { work, text, date: new Date().toLocaleDateString() };
    const { error } = await supabase.from("entries").insert([{ content: payload, user_id: user.id }]);
    if (!error) { setWork(""); setText(""); fetchEntries(); alert("저장 완료!"); }
  };

  if (!user) {
    return (
      <div style={{ display: "flex", flexDirection: "column", padding: "50px", gap: "10px" }}>
        <h2>ARCHIVE LOGIN</h2>
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="PW" value={password} onChange={e => setPassword(e.target.value)} />
        <button onClick={handleLogin}>Login</button>
        <button onClick={handleSignUp} style={{ color: "gray", fontSize: "12px" }}>Sign Up</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>ARCHIVE</h1>
        <button onClick={() => { supabase.auth.signOut(); setUser(null); }}>Out</button>
      </div>
      <div style={{ margin: "20px 0" }}>
        <button onClick={() => setMode("write")}>Write</button>
        <button onClick={() => setMode("archive")}>List</button>
      </div>
      {mode === "write" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <input placeholder="Title" value={work} onChange={e => setWork(e.target.value)} />
          <textarea placeholder="Text" value={text} onChange={e => setText(e.target.value)} style={{ minHeight: "200px" }} />
          <button onClick={handleSave}>Save</button>
        </div>
      ) : (
        <div>
          {entries.map(e => <div key={e.id} style={{ borderBottom: "1px solid #eee", padding: "10px 0" }}><p>{e.text}</p><small>{e.work}</small></div>)}
        </div>
      )}
    </div>
  );
}

// ⚠️ 이 부분이 수정되었습니다.
const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(<App />);
