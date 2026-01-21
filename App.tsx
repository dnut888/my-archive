import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ⚠️ 1번: 아까 찾은 주소와 eyJ...로 시작하는 긴 키를 여기에 넣으세요!
const supabase = createClient(
  "https://dctinbgpmxsfyexnfvbi.supabase.co", 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdGluYmdwbXhzZnlleG5mdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDU4NDQsImV4cCI6MjA4NDU4MTg0NH0.SPiNc-q-u6xHlb5H82EFvl8xBUmzuCIs8w6WS9tauyY"
);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [entries, setEntries] = useState<any[]>([]);
  const [mode, setMode] = useState<"write" | "archive">("write");
  const [work, setWork] = useState("");
  const [text, setText] = useState("");

  // 로그인 상태 체크
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchEntries();
    });
  }, []);

  // 데이터 가져오기
  const fetchEntries = async () => {
    const { data } = await supabase.from("entries").select("*").order('created_at', { ascending: false });
    if (data) setEntries(data.map(d => ({ ...d.content, id: d.id })));
  };

  // 로그인 함수
  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("로그인 실패: " + error.message);
    else { setUser(data.user); fetchEntries(); }
  };

  // 회원가입 함수
  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("가입 확인 메일이 발송되었습니다! 메일함을 확인해주세요.");
  };

  // 저장 함수
  const handleSave = async () => {
    if (!work || !text) return alert("내용을 입력해주세요.");
    const payload = { work, text, date: new Date().toLocaleDateString() };
    const { error } = await supabase.from("entries").insert([{ content: payload, user_id: user.id }]);
    if (!error) { setWork(""); setText(""); fetchEntries(); alert("저장 완료!"); }
    else { alert("저장 실패: " + error.message); }
  };

  // 로그아웃 함수
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setEntries([]);
  };

  // --- 화면 UI ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f2] p-6 font-sans">
        <div className="w-full max-w-sm space-y-4 bg-white p-8 rounded-3xl shadow-lg">
          <h1 className="text-xl font-bold text-center mb-6">나의 비밀 아카이브</h1>
          <input type="email" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 border rounded-xl outline-none focus:border-black" />
          <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 border rounded-xl outline-none focus:border-black" />
          <button onClick={handleLogin} className="w-full py-4 bg-black text-white rounded-xl font-bold active:scale-95 transition-transform">로그인</button>
          <button onClick={handleSignUp} className="w-full text-sm text-stone-400">계정이 없으신가요? 회원가입</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f2] text-[#3a3a3a] pb-20 font-sans">
      <header className="p-6 flex justify-between items-center border-b max-w-md mx-auto">
        <h1 className="text-xl font-serif font-bold italic tracking-tighter">ARCHIVE</h1>
        <button onClick={handleLogout} className="text-xs opacity-40 underline touch-target">로그아웃</button>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-6">
        <nav className="flex gap-4 border-b">
          <button onClick={() => setMode("write")} className={`pb-2 px-2 transition-all ${mode === "write" ? "border-b-2 border-black font-bold" : "opacity-40"}`}>기록하기</button>
          <button onClick={() => setMode("archive")} className={`pb-2 px-2 transition-all ${mode === "archive" ? "border-b-2 border-black font-bold" : "opacity-40"}`}>모아보기</button>
        </nav>

        {mode === "write" ? (
          <div className="flex flex-col gap-4 animate-in fade-in duration-500">
            <input placeholder="작품명이나 제목" value={work} onChange={e => setWork(e.target.value)} className="p-4 bg-white rounded-xl shadow-sm outline-none focus:ring-1 ring-black/5" />
            <textarea placeholder="간직하고 싶은 문장을 적으세요" value={text} onChange={e => setText(e.target.value)} className="p-4 bg-white rounded-xl shadow-sm min-h-[250px] outline-none focus:ring-1 ring-black/5" />
            <button onClick={handleSave} className="py-5 bg-stone-800 text-white rounded-2xl font-bold text-lg active:scale-95 transition-all shadow-md mt-2">안전하게 저장</button>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-500">
            {entries.length === 0 && <p className="text-center opacity-40 py-20 text-sm">아직 기록이 없습니다.</p>}
            {entries.map(e => (
              <div key={e.id} className="p-5 bg-white rounded-2xl shadow-sm border border-black/5 hover:border-black/10 transition-colors">
                <p className="leading-relaxed mb-3 font-medium text-[16px]">"{e.text}"</p>
                <div className="text-[11px] opacity-40 font-bold tracking-wider uppercase">{e.work} · {e.date}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
