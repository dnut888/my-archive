import React, { useMemo, useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://dctinbgpmxsfyexnfvbi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdGluYmdwbXhzZnlleG5mdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDU4NDQsImV4cCI6MjA4NDU4MTg0NH0.SPiNc-q-u6xHlb5H82EFvl8xBUmzuCIs8w6WS9tauyY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [mode, setMode] = useState<"write" | "archive" | "style">("write");
  const [openWork, setOpenWork] = useState<string | null>(null);
  const [openEntryId, setOpenEntryId] = useState<number | null>(null);
  const [focusEntry, setFocusEntry] = useState<any | null>(null);

  // 설정 상태
  const [bgColor, setBgColor] = useState(() => localStorage.getItem("arch_bg") || "#f5f5f2");
  const [textColor, setTextColor] = useState(() => localStorage.getItem("arch_text") || "#1a1a1a");
  const [lineSize, setLineSize] = useState(() => Number(localStorage.getItem("arch_size")) || 14);
  const [koreanFont, setKoreanFont] = useState(() => localStorage.getItem("arch_font") || "BookkMyungjo");
  const [fontLink, setFontLink] = useState(() => localStorage.getItem("arch_font_link") || "");
  const [night, setNight] = useState(() => localStorage.getItem("arch_night") === "true");

  // 입력 상태
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

  // 로컬 데이터 우선 로드 및 세션 체크
  useEffect(() => {
    const local = localStorage.getItem("archive_full_backup");
    if (local) setEntries(JSON.parse(local));

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser(data.session.user);
        fetchDB(data.session.user);
      }
    });
  }, []);

  const fetchDB = async (currentUser: any) => {
    if (!currentUser || currentUser.id === 'guest') return;
    const { data, error } = await supabase.from("entries").select("*");
    if (!error && data) {
      const dbEntries = data.map((d: any) => ({ ...d.content, db_id: d.id }));
      setEntries(dbEntries);
      localStorage.setItem("archive_full_backup", JSON.stringify(dbEntries));
    }
  };

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert("실패: " + error.message);
    setUser(data.user);
    fetchDB(data.user);
  };

  const save = async () => {
    if (!work || !text) return alert("내용을 입력하세요.");
    
    const payload = {
      work, date, time, character, text, comment,
      id: editingId || Date.now(),
      keywords: keywords ? keywords.split(",").map(k => k.trim()).filter(Boolean) : [],
      favorite: editingId ? (entries.find(e => e.id === editingId)?.favorite || false) : false
    };

    // [화면 즉시 반영] - DB보다 먼저 실행
    const nextEntries = editingId ? entries.map(e => e.id === editingId ? payload : e) : [payload, ...entries];
    setEntries(nextEntries);
    localStorage.setItem("archive_full_backup", JSON.stringify(nextEntries));

    // DB 저장 (백그라운드)
    if (user && user.id !== 'guest') {
      try {
        if (editingId) {
          const target = entries.find(e => e.id === editingId);
          if (target?.db_id) await supabase.from("entries").update({ content: payload }).eq('id', target.db_id);
        } else {
          await supabase.from("entries").insert([{ content: payload, user_id: user.id }]);
        }
      } catch (err) { console.error(err); }
    }

    // 입력창 초기화 및 모드 변경
    setWork(""); setDate(""); setTime(""); setKeywords(""); setCharacter(""); setText(""); setComment("");
    setEditingId(null); setMode("archive");
  };

  const handleBackup = (type: string) => {
    if (type === 'json') {
      const blob = new Blob([JSON.stringify(entries, null, 2)], {type:'application/json'});
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='arch.json'; a.click();
    } else if (type === 'txt') {
      const txt = entries.map(e => `[${e.work}]\n${e.date} | ${e.character}\n${e.text}\n\n`).join('');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], {type:'text/plain'})); a.download='arch.txt'; a.click();
    } else if (type === 'html') {
      const html = `<html><body style="background:${activeBg};color:${activeText};padding:50px;font-family:serif;">${entries.map(e=>`<div><h2>${e.work}</h2><p>${e.date} | ${e.character}</p><p>${e.text}</p><hr/></div>`).join('')}</body></html>`;
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], {type:'text/html'})); a.download='arch.html'; a.click();
    } else if (type === 'pdf') { window.print(); }
  };

  const grouped = useMemo(() => {
    let base = [...entries].sort((a, b) => b.id - a.id);
    if (onlyFavorite) base = base.filter(e => e.favorite);
    if (query) base = base.filter(e => [e.text, e.work, e.character].some(v => v?.toLowerCase().includes(query.toLowerCase())));
    return base.reduce((acc: any, cur) => { acc[cur.work] = acc[cur.work] || []; acc[cur.work].push(cur); return acc; }, {});
  }, [entries, query, onlyFavorite]);

  const activeBg = night ? "#1a1a1a" : bgColor;
  const activeText = night ? "#e5e5e5" : textColor;

  // 유저가 없으면 무조건 로그인 창만 띄움
  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center font-en" style={{ background: activeBg, color: activeText }}>
        <div className="w-64 space-y-
