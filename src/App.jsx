import React, { useState, useRef, useEffect } from "react";
import Auth from "./Auth";

const API = "https://dr-mediassist-backend.onrender.com/api";
const GEMINI_API_KEY = "AIzaSyCE5rKfcdOLqKT0PJAnWivu__UO_K9p5ik";

const CONDITIONS_LIST = [
  { id: "diabetes_t1", label: "Diabetes (Type 1)" },
  { id: "diabetes_t2", label: "Diabetes (Type 2)" },
  { id: "hypertension", label: "High Blood Pressure" },
  { id: "hypotension", label: "Low Blood Pressure" },
  { id: "pregnancy", label: "Pregnant" },
  { id: "asthma", label: "Asthma" },
  { id: "heart_disease", label: "Heart Disease" },
  { id: "thyroid", label: "Thyroid Disorder" },
  { id: "kidney", label: "Kidney Disease" },
  { id: "liver", label: "Liver Disease" },
  { id: "arthritis", label: "Arthritis" },
  { id: "epilepsy", label: "Epilepsy" },
  { id: "pcod", label: "PCOS / PCOD" },
  { id: "anemia", label: "Anemia" },
];

const QUICK_SYMPTOMS = [
  "I have a headache", "I have a fever", "I have cold & cough",
  "I have stomach pain", "I feel dizzy", "I have chest pain",
  "I have back pain", "I have a sore throat",
  "I feel fatigued", "I have a skin rash", "I feel anxious", "I have nausea",
];

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

const T = {
  teal: "#0D9488", tealD: "#0F766E", tealL: "#CCFBF1", tealXL: "#F0FDFA",
  blue: "#0891B2", bg: "#F1F5F9", white: "#FFFFFF",
  text: "#0F172A", textM: "#64748B", textL: "#94A3B8",
  border: "#E2E8F0", borderM: "#CBD5E1",
  red: "#DC2626", redL: "#FEF2F2", redM: "#FCA5A5",
  amber: "#D97706", amberL: "#FEF3C7", amberM: "#FCD34D",
  green: "#16A34A", greenL: "#F0FDF4", greenM: "#86EFAC",
  blueCard: "#2563EB", blueL: "#EFF6FF", blueM: "#93C5FD",
  orange: "#EA580C", orangeL: "#FFF7ED", orangeM: "#FDBA74",
};

function buildSystemPrompt(patient) {
  const bmi = patient.weight && patient.height
    ? (parseFloat(patient.weight) / Math.pow(parseFloat(patient.height) / 100, 2)).toFixed(1)
    : "Unknown";
  const bmiNote = bmi !== "Unknown"
    ? parseFloat(bmi) < 18.5 ? " (Underweight)" : parseFloat(bmi) < 25 ? " (Normal)" : parseFloat(bmi) < 30 ? " (Overweight)" : " (Obese)"
    : "";
  const condLabels = CONDITIONS_LIST.filter(c => patient.conditions.includes(c.id)).map(c => c.label);
  return `You are Dr. MediAssist, a compassionate, knowledgeable, and safety-first AI medical assistant.

PATIENT MEDICAL RECORD:
Name: ${patient.name || "Patient"} | Age: ${patient.age || "?"} yrs | Gender: ${patient.gender || "Unknown"}
Weight: ${patient.weight || "?"} kg | Height: ${patient.height || "?"} cm | BMI: ${bmi}${bmiNote}
Blood Type: ${patient.bloodType || "Unknown"}
Medical Conditions: ${condLabels.length ? condLabels.join(", ") : "None reported"}
Known Allergies: ${patient.allergies?.length ? patient.allergies.join(", ") : "None reported"}
Current Medications: ${patient.currentMedications || "None"}
Smoking: ${patient.smokingStatus} | Alcohol: ${patient.alcoholUse}

CRITICAL RULES:
- EMERGENCY symptoms (chest pain, stroke, anaphylaxis): Immediately say call 112/911
- PREGNANCY: Only Category A/B medications
- Check ALL medications against patient's allergies and current medications
- Ask ONE question at a time. Never list multiple questions together. After the patient answers, ask the next question naturally.
- Only after gathering enough info (usually 2-3 exchanges), provide your full structured guidance.
- At the END of every complete diagnosis response, always add a "Find Nearby Doctor" suggestion.

RESPONSE FORMAT for diagnosis (use after enough info gathered):
[MED]medication name|dosage|frequency|duration|safety note[/MED]
[DOC]Specialist Type|When to consult[/DOC]
[EX]Remedy|How to do it|Benefit[/EX]
[WARN]Warning message - only for urgent situations[/WARN]
[NEARBY]yes[/NEARBY]

For follow-up questions, just ask ONE natural conversational question — no structured blocks needed.
Speak warmly and clearly. End diagnosis responses with:
"⚕️ Disclaimer: This guidance is informational only. Please see a qualified doctor for proper diagnosis."`;
}

function parseBlocks(text) {
  const regex = /\[(MED|DOC|EX|WARN|NEARBY)\]([\s\S]*?)\[\/(?:MED|DOC|EX|WARN|NEARBY)\]/g;
  const parts = [];
  let lastIndex = 0, match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const t = text.slice(lastIndex, match.index).trim();
      if (t) parts.push({ type: "text", content: t });
    }
    parts.push({ type: match[1], content: match[2].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    const t = text.slice(lastIndex).trim();
    if (t) parts.push({ type: "text", content: t });
  }
  return parts.length ? parts : [{ type: "text", content: text }];
}

function RichText({ text }) {
  return (
    <div style={{ lineHeight: 1.7, color: T.text, fontSize: 14 }}>
      {text.split("\n").map((line, i) => {
        if (!line.trim()) return <br key={i} />;
        const segments = line.split(/\*\*(.*?)\*\*/g);
        return <p key={i} style={{ margin: "4px 0" }}>{segments.map((seg, j) => j % 2 === 1 ? <strong key={j}>{seg}</strong> : seg)}</p>;
      })}
    </div>
  );
}

function MedBlock({ content, onCopy }) {
  const [copied, setCopied] = useState(false);
  const [name, dosage, frequency, duration, note] = content.split("|").map(s => s.trim());
  const medText = `${name} — ${dosage}, ${frequency}, for ${duration}`;
  const handleCopy = () => {
    navigator.clipboard.writeText(medText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ background: T.greenL, border: `1px solid ${T.greenM}`, borderRadius: 12, padding: "12px 14px", margin: "8px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 16 }}>💊</span>
          <span style={{ fontWeight: 600, color: T.green, fontSize: 13 }}>Medication Suggestion</span>
        </div>
        <button onClick={handleCopy} style={{ background: "#DCFCE7", border: "none", cursor: "pointer", color: "#15803D", fontSize: 11, padding: "3px 8px", borderRadius: 6 }}>
          {copied ? "✅ Saved!" : "📋 Save"}
        </button>
      </div>
      <div style={{ fontWeight: 700, color: "#14532D", fontSize: 15, marginBottom: 6 }}>{name}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: note ? 8 : 0 }}>
        {[dosage, frequency, duration].filter(Boolean).map((tag, i) => (
          <span key={i} style={{ background: "#DCFCE7", color: "#15803D", padding: "2px 9px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{tag}</span>
        ))}
      </div>
      {note && <div style={{ fontSize: 12, color: "#166534", borderTop: `1px solid ${T.greenM}`, paddingTop: 7, marginTop: 4 }}>ℹ️ {note}</div>}
    </div>
  );
}

function DocBlock({ content }) {
  const [specialty, reason] = content.split("|").map(s => s.trim());
  return (
    <div style={{ background: T.blueL, border: `1px solid ${T.blueM}`, borderRadius: 12, padding: "12px 14px", margin: "8px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
        <span style={{ fontSize: 16 }}>🩺</span>
        <span style={{ fontWeight: 600, color: T.blueCard, fontSize: 13 }}>Consult a Doctor</span>
      </div>
      <div style={{ fontWeight: 700, color: "#1E3A8A", fontSize: 15, marginBottom: 4 }}>{specialty}</div>
      {reason && <div style={{ fontSize: 13, color: "#1D4ED8" }}>{reason}</div>}
    </div>
  );
}

function ExBlock({ content }) {
  const [activity, instructions, benefit] = content.split("|").map(s => s.trim());
  return (
    <div style={{ background: T.orangeL, border: `1px solid ${T.orangeM}`, borderRadius: 12, padding: "12px 14px", margin: "8px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
        <span style={{ fontSize: 16 }}>🏃</span>
        <span style={{ fontWeight: 600, color: T.orange, fontSize: 13 }}>Exercise / Home Remedy</span>
      </div>
      <div style={{ fontWeight: 700, color: "#7C2D12", fontSize: 15, marginBottom: 4 }}>{activity}</div>
      {instructions && <div style={{ fontSize: 13, color: "#9A3412", marginBottom: 3 }}>{instructions}</div>}
      {benefit && <div style={{ fontSize: 12, color: "#7C2D12", fontStyle: "italic" }}>{benefit}</div>}
    </div>
  );
}

function WarnBlock({ content }) {
  return (
    <div style={{ background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 12, padding: "12px 14px", margin: "8px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>⚠️</span>
        <span style={{ fontWeight: 700, color: T.red, fontSize: 13 }}>Important Warning</span>
      </div>
      <div style={{ fontSize: 13, color: "#991B1B", fontWeight: 500 }}>{content}</div>
    </div>
  );
}

function NearbyBlock({ onFind }) {
  return (
    <div style={{ background: T.blueL, border: `1px solid ${T.blueM}`, borderRadius: 12, padding: "12px 14px", margin: "8px 0" }}>
      <div style={{ fontSize: 13, color: "#1D4ED8", fontWeight: 600, marginBottom: 8 }}>
        📍 Find a Doctor Near You
      </div>
      <p style={{ fontSize: 12, color: "#3B82F6", margin: "0 0 10px" }}>
        Would you like to find nearby clinics or hospitals for an in-person consultation?
      </p>
      <button onClick={onFind}
        style={{ padding: "8px 16px", background: "#2563EB", color: "white", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
        📍 Find Nearby Doctors
      </button>
    </div>
  );
}

function Bubble({ msg, onFindNearby, onCopy }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";
  if (isUser) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <div style={{ maxWidth: "72%", background: `linear-gradient(135deg, ${T.teal}, ${T.blue})`, color: "white", borderRadius: "18px 18px 4px 18px", padding: "10px 16px", fontSize: 14, lineHeight: 1.55 }}>{msg.content}</div>
      </div>
    );
  }
  const parts = parseBlocks(msg.content);
  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content.replace(/\[.*?\]/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-start" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${T.teal}, ${T.blue})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>
        🩺
      </div>
      <div style={{ maxWidth: "83%", background: T.white, borderRadius: "4px 18px 18px 18px", padding: "12px 16px", border: `1px solid ${T.border}`, fontSize: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        {parts.map((p, i) => {
          if (p.type === "text") return <RichText key={i} text={p.content} />;
          if (p.type === "MED") return <MedBlock key={i} content={p.content} onCopy={onCopy} />;
          if (p.type === "DOC") return <DocBlock key={i} content={p.content} />;
          if (p.type === "EX") return <ExBlock key={i} content={p.content} />;
          if (p.type === "WARN") return <WarnBlock key={i} content={p.content} />;
          if (p.type === "NEARBY") return <NearbyBlock key={i} onFind={onFindNearby} />;
          return null;
        })}
        <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={handleCopy} style={{ background: "none", border: "none", cursor: "pointer", color: T.textL, fontSize: 11, display: "flex", alignItems: "center", gap: 4, padding: "2px 6px" }}>
            {copied ? "✅ Copied" : "📋 Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${T.teal}, ${T.blue})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>🩺</div>
      <div style={{ background: T.white, borderRadius: "4px 18px 18px 18px", padding: "14px 18px", border: `1px solid ${T.border}`, display: "flex", gap: 5, alignItems: "center" }}>
        {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: T.teal, animation: `mediPulse 1s ${i * 0.2}s infinite` }} />)}
      </div>
    </div>
  );
}

function PainScale({ onSelect }) {
  const [selected, setSelected] = useState(null);
  const colors = ["#22C55E","#4ADE80","#86EFAC","#BEF264","#FDE047","#FACC15","#FB923C","#F97316","#EF4444","#DC2626"];
  const labels = ["No pain","Very mild","Mild","Moderate","Moderate","Strong","Strong","Severe","Very severe","Worst"];
  return (
    <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", margin: "8px 0" }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 10 }}>📏 Rate your pain level (1-10):</div>
      <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
        {colors.map((color, i) => (
          <button key={i} onClick={() => setSelected(i + 1)}
            style={{ flex: 1, height: 36, borderRadius: 8, border: selected === i + 1 ? "2px solid #0F172A" : "2px solid transparent", background: color, cursor: "pointer", fontSize: 12, fontWeight: 700, color: i < 4 ? "#14532D" : i < 6 ? "#713F12" : "white", transform: selected === i + 1 ? "scale(1.1)" : "scale(1)", transition: "all 0.15s" }}>
            {i + 1}
          </button>
        ))}
      </div>
      {selected && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: T.textM }}>Selected: <strong>{selected}/10 — {labels[selected - 1]}</strong></span>
          <button onClick={() => onSelect(selected)} style={{ padding: "6px 14px", background: T.teal, color: "white", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Send</button>
        </div>
      )}
    </div>
  );
}

function DurationSelector({ onSelect }) {
  const options = ["Less than 1 hour", "A few hours", "Since yesterday", "2-3 days", "About a week", "More than a week", "More than a month"];
  return (
    <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", margin: "8px 0" }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 10 }}>⏱ How long have you had this symptom?</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {options.map(o => (
          <button key={o} onClick={() => onSelect(o)}
            style={{ padding: "7px 13px", border: `1.5px solid ${T.border}`, borderRadius: 20, background: T.white, color: T.textM, fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, min, max }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      {label && <label style={{ fontSize: 13, color: T.textM, display: "block", marginBottom: 5, fontWeight: 500 }}>{label}</label>}
      <input type={type} value={value} placeholder={placeholder} min={min} max={max}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${focused ? T.teal : T.border}`, borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", background: T.white, color: T.text, transition: "border-color 0.2s" }} />
    </div>
  );
}

export default function AIDoctorApp() {
  const [authUser, setAuthUser] = useState(() => {
    const token = localStorage.getItem("token");
    const name = localStorage.getItem("userName");
    const userId = localStorage.getItem("userId");
    return token ? { token, name, userId } : null;
  });
  const [screen, setScreen] = useState("onboarding");
  const [step, setStep] = useState(1);
  const [patient, setPatient] = useState({
    name: "", age: "", gender: "", weight: "", height: "",
    bloodType: "Unknown", allergies: [], conditions: [],
    currentMedications: "", smokingStatus: "no", alcoholUse: "no",
  });
  const [allergyInput, setAllergyInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPainScale, setShowPainScale] = useState(false);
  const [showDuration, setShowDuration] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  const bmi = patient.weight && patient.height
    ? (parseFloat(patient.weight) / Math.pow(parseFloat(patient.height) / 100, 2)).toFixed(1)
    : null;
  const bmiCategory = bmi
    ? parseFloat(bmi) < 18.5 ? "Underweight" : parseFloat(bmi) < 25 ? "Normal" : parseFloat(bmi) < 30 ? "Overweight" : "Obese"
    : null;

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    if (authUser) {
      fetch(`${API}/patient/get`, { headers: { Authorization: `Bearer ${authUser.token}` } })
        .then(r => r.json())
        .then(data => {
          if (data.patient) {
            setPatient(data.patient);
            startChatWithPatient(data.patient, authUser.name);
          } else {
            setPatient(p => ({ ...p, name: authUser.name || "" }));
          }
        })
        .catch(() => setPatient(p => ({ ...p, name: authUser.name || "" })));
    }
  }, [authUser]);

  const startChatWithPatient = (p, name) => {
    setMessages([{
      role: "assistant",
      content: `Hello, **${name || p?.name || "there"}!** I'm **Dr. MediAssist**, your AI health companion.\n\nI've reviewed your medical profile. I'm here to help you with:\n\n**• Medication guidance** — personalized to your conditions\n**• Home remedies & exercises** — safe and effective\n**• Doctor referrals** — the right specialist for you\n\nWhat health concern brings you here today? Please describe your main symptom.`,
    }]);
    setScreen("chat");
  };

  const startChat = async () => {
    setSavingProfile(true);
    if (authUser) {
      await fetch(`${API}/patient/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authUser.token}` },
        body: JSON.stringify(patient),
      }).catch(() => {});
    }
    setSavingProfile(false);
    startChatWithPatient(patient, patient.name);
  };

  const saveChat = async (msgs) => {
    if (!authUser || msgs.length < 2) return;
    const firstUserMsg = msgs.find(m => m.role === "user");
    const title = firstUserMsg?.content?.slice(0, 50) || "Consultation";
    await fetch(`${API}/chat/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authUser.token}` },
      body: JSON.stringify({ messages: msgs, title }),
    }).catch(() => {});
  };

  const deleteChat = async (chatId, e) => {
    e.stopPropagation();
    await fetch(`${API}/chat/${chatId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authUser.token}` },
    }).catch(() => {});
    setChatHistory(prev => prev.filter(c => c._id !== chatId));
  };

  const loadHistory = async () => {
    if (!authUser) return;
    const res = await fetch(`${API}/chat/history`, { headers: { Authorization: `Bearer ${authUser.token}` } });
    const data = await res.json();
    setChatHistory(data.chats || []);
    setShowHistory(true);
  };

  const findNearbyDoctors = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const { latitude, longitude } = pos.coords;
          window.open(`https://www.google.com/maps/search/doctors+hospitals+clinics/@${latitude},${longitude},14z`, "_blank");
        },
        () => window.open("https://www.google.com/maps/search/doctors+hospitals+clinics/", "_blank")
      );
    } else {
      window.open("https://www.google.com/maps/search/doctors+hospitals+clinics/", "_blank");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const toggleCondition = id => setPatient(p => ({ ...p, conditions: p.conditions.includes(id) ? p.conditions.filter(c => c !== id) : [...p.conditions, id] }));
  const addAllergy = () => { const v = allergyInput.trim(); if (!v) return; setPatient(p => ({ ...p, allergies: [...p.allergies, v] })); setAllergyInput(""); };
  const removeAllergy = i => setPatient(p => ({ ...p, allergies: p.allergies.filter((_, idx) => idx !== i) }));

  const sendMessage = async (text) => {
    const userText = text || chatInput.trim();
    if (!userText || loading) return;
    setChatInput("");
    setShowPainScale(false);
    setShowDuration(false);

    const newMsgs = [...messages, { role: "user", content: userText }];
    setMessages(newMsgs);
    setLoading(true);

    try {
      // Guard: only block non-medical on the FIRST user message
      // Follow-up answers in ongoing conversations always pass through
      const isFirstMessage = messages.length <= 1;
      if (isFirstMessage) {
        const medKeywords = ["headache","fever","pain","cough","cold","dizzy","nausea","rash","itch","vomit","diarrhea","constipation","tired","fatigue","breathe","breath","chest","throat","stomach","back","leg","arm","head","eye","ear","nose","skin","heart","blood","pressure","sugar","diabetes","asthma","allergy","allergic","medicine","medication","drug","tablet","pill","dose","symptom","disease","ill","sick","infection","wound","injury","hurt","ache","sore","swollen","swelling","doctor","hospital","clinic","health","medical","treatment","surgery","pregnant","period","anxiety","depressed","stress","sleep","insomnia","weight","diet","nutrition","vitamin","exercise","cancer","temperature","vomit","bleed","discharge","urine","stool","bowel","muscle","joint","bone","nerve","forehead","throat","knee","ankle","shoulder","wrist","hip","elbow","tooth","gum","tongue","lip","neck"];
        const lowerText = userText.toLowerCase();
        const isMedical = medKeywords.some(k => lowerText.includes(k)) ||
          ["i have","i feel","i am","i'm","my ","hurts","aching","burning","itching","swelling","bleeding","it started","since","since yesterday","since last"].some(k => lowerText.includes(k));
        if (!isMedical) {
          const refusal = [...newMsgs, { role: "assistant", content: "I'm Dr. MediAssist, your dedicated health companion. I can only assist with medical and health-related questions. Please describe your symptoms or any health concern." }];
          setMessages(refusal);
          setLoading(false);
          chatInputRef.current?.focus();
          return;
        }
      }

      const geminiHistory = newMsgs.slice(0, -1).map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ system_instruction: { parts: [{ text: buildSystemPrompt(patient) }] }, contents: [...geminiHistory, { role: "user", parts: [{ text: userText }] }], generationConfig: { maxOutputTokens: 2048, temperature: 0.7 } }) }
      );
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response. Please try again.";
      const finalMsgs = [...newMsgs, { role: "assistant", content: reply }];
      setMessages(finalMsgs);
      saveChat(finalMsgs);
    } catch {
      setMessages([...newMsgs, { role: "assistant", content: "Connection error. Please check your network and try again." }]);
    }
    setLoading(false);
    chatInputRef.current?.focus();
  };

  const logout = () => {
    localStorage.clear();
    setAuthUser(null);
    setScreen("onboarding");
    setMessages([]);
  };

  const startNewChat = () => {
    setMessages([]);
    setShowHistory(false);
    startChatWithPatient(patient, patient.name || authUser?.name);
  };

  if (!authUser) return <Auth onLogin={data => setAuthUser(data)} />;

  const STEPS = ["Personal Info", "Physical Stats", "Medical History", "Allergies", "Lifestyle"];
  const canProceed = step === 1 ? patient.name && patient.age && patient.gender : true;

  if (screen === "onboarding") {
    return (
      <div style={{ minHeight: "100vh", background: `linear-gradient(160deg, ${T.teal} 0%, ${T.blue} 55%, #1E3A8A 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "system-ui, sans-serif" }}>
        <style>{`@keyframes mediPulse{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-7px)}} @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}} .step-card{animation:fadeIn 0.3s ease} input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}`}</style>
        <div style={{ background: T.white, borderRadius: 24, width: "100%", maxWidth: 560, overflow: "hidden", boxShadow: "0 32px 64px rgba(0,0,0,0.2)" }}>
          <div style={{ background: `linear-gradient(135deg, ${T.teal}, ${T.blue})`, padding: "28px 32px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
              <div style={{ width: 52, height: 52, background: "rgba(255,255,255,0.18)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🏥</div>
              <div>
                <h1 style={{ color: "white", margin: 0, fontSize: 22, fontWeight: 800 }}>Dr. MediAssist</h1>
                <p style={{ color: "rgba(255,255,255,0.78)", margin: 0, fontSize: 13 }}>Complete your health profile</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
              {STEPS.map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < step ? "white" : "rgba(255,255,255,0.28)", transition: "background 0.35s" }} />)}
            </div>
            <p style={{ color: "rgba(255,255,255,0.85)", margin: 0, fontSize: 12, fontWeight: 500 }}>Step {step} of {STEPS.length} — {STEPS[step - 1]}</p>
          </div>

          <div className="step-card" style={{ padding: "26px 32px 22px" }} key={step}>
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 19, color: T.text, fontWeight: 700 }}>Tell us about yourself</h2>
                <Input label="Full Name *" value={patient.name} onChange={v => setPatient(p => ({ ...p, name: v }))} placeholder="Enter your full name" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Input label="Age *" type="number" value={patient.age} onChange={v => setPatient(p => ({ ...p, age: v }))} placeholder="Years" min="1" max="120" />
                  <div>
                    <label style={{ fontSize: 13, color: T.textM, display: "block", marginBottom: 5, fontWeight: 500 }}>Gender *</label>
                    <select value={patient.gender} onChange={e => setPatient(p => ({ ...p, gender: e.target.value }))}
                      style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: 14, outline: "none", background: T.white, color: patient.gender ? T.text : T.textL, boxSizing: "border-box" }}>
                      <option value="">Select</option>
                      {["Male", "Female", "Other", "Prefer not to say"].map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 19, color: T.text, fontWeight: 700 }}>Physical Information</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Input label="Weight (kg)" type="number" value={patient.weight} onChange={v => setPatient(p => ({ ...p, weight: v }))} placeholder="e.g. 70" />
                  <Input label="Height (cm)" type="number" value={patient.height} onChange={v => setPatient(p => ({ ...p, height: v }))} placeholder="e.g. 170" />
                </div>
                {bmi && (
                  <div style={{ background: T.tealXL, border: `1px solid ${T.tealL}`, borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: T.tealD, fontWeight: 500 }}>Your BMI</span>
                    <span style={{ fontWeight: 800, color: T.teal, fontSize: 17 }}>{bmi} <span style={{ fontSize: 12, fontWeight: 400 }}>({bmiCategory})</span></span>
                  </div>
                )}
                <div>
                  <label style={{ fontSize: 13, color: T.textM, display: "block", marginBottom: 8, fontWeight: 500 }}>Blood Type</label>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    {BLOOD_TYPES.map(bt => (
                      <button key={bt} onClick={() => setPatient(p => ({ ...p, bloodType: bt }))}
                        style={{ padding: "6px 13px", borderRadius: 8, border: `${patient.bloodType === bt ? 2 : 1.5}px solid ${patient.bloodType === bt ? T.teal : T.border}`, background: patient.bloodType === bt ? T.tealXL : T.white, color: patient.bloodType === bt ? T.teal : T.textM, fontSize: 13, cursor: "pointer", fontWeight: patient.bloodType === bt ? 700 : 400 }}>
                        {bt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {step === 3 && (
              <div>
                <h2 style={{ margin: "0 0 14px", fontSize: 19, color: T.text, fontWeight: 700 }}>Medical Conditions</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {CONDITIONS_LIST.map(c => {
                    const sel = patient.conditions.includes(c.id);
                    return (
                      <button key={c.id} onClick={() => toggleCondition(c.id)}
                        style={{ padding: "9px 12px", borderRadius: 10, border: `${sel ? 2 : 1.5}px solid ${sel ? T.teal : T.border}`, background: sel ? T.tealXL : T.white, color: sel ? T.teal : T.textM, fontSize: 13, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 7, fontWeight: sel ? 600 : 400 }}>
                        {sel && <span>✓</span>}{c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {step === 4 && (
              <div>
                <h2 style={{ margin: "0 0 14px", fontSize: 19, color: T.text, fontWeight: 700 }}>Known Allergies</h2>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input value={allergyInput} onChange={e => setAllergyInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addAllergy()}
                    placeholder="e.g. Penicillin, Aspirin, Peanuts..."
                    style={{ flex: 1, padding: "10px 14px", border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: 14, outline: "none", color: T.text }} />
                  <button onClick={addAllergy} style={{ padding: "10px 18px", background: T.teal, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Add</button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {patient.allergies.map((a, i) => (
                    <span key={i} style={{ padding: "6px 12px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 20, color: "#991B1B", fontSize: 13, display: "flex", alignItems: "center", gap: 7 }}>
                      {a}<button onClick={() => removeAllergy(i)} style={{ background: "none", border: "none", cursor: "pointer", color: T.red, padding: 0 }}>×</button>
                    </span>
                  ))}
                  {patient.allergies.length === 0 && <p style={{ color: T.textL, fontSize: 13 }}>No allergies added — you can skip this step</p>}
                </div>
              </div>
            )}
            {step === 5 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 19, color: T.text, fontWeight: 700 }}>Lifestyle & Medications</h2>
                {[["Smoking Status", "smokingStatus", ["no", "occasionally", "regularly"], ["Non-smoker", "Occasional", "Regular"]],
                  ["Alcohol Use", "alcoholUse", ["no", "occasionally", "regularly"], ["None", "Occasional", "Regular"]]].map(([lbl, key, vals, labels]) => (
                  <div key={key}>
                    <label style={{ fontSize: 13, color: T.textM, display: "block", marginBottom: 8, fontWeight: 500 }}>{lbl}</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {vals.map((v, i) => (
                        <button key={v} onClick={() => setPatient(p => ({ ...p, [key]: v }))}
                          style={{ flex: 1, padding: "9px 6px", borderRadius: 10, border: `${patient[key] === v ? 2 : 1.5}px solid ${patient[key] === v ? T.teal : T.border}`, background: patient[key] === v ? T.tealXL : T.white, color: patient[key] === v ? T.teal : T.textM, fontSize: 13, cursor: "pointer", fontWeight: patient[key] === v ? 700 : 400 }}>
                          {labels[i]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 13, color: T.textM, display: "block", marginBottom: 6, fontWeight: 500 }}>Current Medications</label>
                  <textarea value={patient.currentMedications} onChange={e => setPatient(p => ({ ...p, currentMedications: e.target.value }))}
                    placeholder="List any medications, supplements, or vitamins you currently take..."
                    rows={3} style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", color: T.text }} />
                </div>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
              {step > 1 ? <button onClick={() => setStep(s => s - 1)} style={{ padding: "10px 20px", border: `1.5px solid ${T.border}`, borderRadius: 10, background: T.white, color: T.textM, fontSize: 14, cursor: "pointer" }}>← Back</button> : <div />}
              {step < 5
                ? <button onClick={() => canProceed && setStep(s => s + 1)} disabled={!canProceed} style={{ padding: "10px 26px", border: "none", borderRadius: 10, background: canProceed ? T.teal : T.borderM, color: "white", fontSize: 14, cursor: canProceed ? "pointer" : "not-allowed", fontWeight: 700 }}>Next →</button>
                : <button onClick={startChat} disabled={savingProfile} style={{ padding: "12px 28px", border: "none", borderRadius: 12, background: `linear-gradient(135deg, ${T.teal}, ${T.blue})`, color: "white", fontSize: 15, cursor: "pointer", fontWeight: 700 }}>{savingProfile ? "Saving..." : "Start Consultation →"}</button>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: T.bg, fontFamily: "system-ui, sans-serif", overflow: "hidden" }}>
      <style>{`@keyframes mediPulse{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-7px)}} ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:10px} .chip:hover{border-color:#0D9488!important;color:#0D9488!important;background:#F0FDFA!important}`}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${T.teal}, ${T.blue})`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, boxShadow: "0 3px 10px rgba(0,0,0,0.12)", flexWrap: "nowrap", minHeight: 60 }}>
        <div style={{ width: 36, height: 36, background: "rgba(255,255,255,0.18)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🏥</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "white", fontWeight: 800, fontSize: 15, whiteSpace: "nowrap" }}>Dr. MediAssist</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ADE80", flexShrink: 0 }} />
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, whiteSpace: "nowrap" }}>Always available</span>
          </div>
        </div>
        <button onClick={startNewChat} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.28)", borderRadius: 8, padding: "5px 10px", color: "white", cursor: "pointer", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
          ➕ New
        </button>
        <button onClick={loadHistory} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.28)", borderRadius: 8, padding: "5px 10px", color: "white", cursor: "pointer", fontSize: 11, whiteSpace: "nowrap", flexShrink: 0 }}>
          🕐 History
        </button>
        <button onClick={() => setShowProfile(v => !v)} style={{ background: showProfile ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.28)", borderRadius: 8, padding: "5px 10px", color: "white", cursor: "pointer", fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis" }}>
          👤 {(patient.name || authUser?.name || "Profile").split(" ")[0]}
        </button>
        <button onClick={() => { if (window.confirm("Call emergency services (112)?")) window.open("tel:112"); }}
          style={{ background: "#DC2626", border: "none", borderRadius: 8, padding: "5px 10px", color: "white", cursor: "pointer", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
          🚨 SOS
        </button>
        <button onClick={logout} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.28)", borderRadius: 8, padding: "5px 10px", color: "white", cursor: "pointer", fontSize: 11, whiteSpace: "nowrap", flexShrink: 0 }}>
          🚪
        </button>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Profile Sidebar */}
        {showProfile && (
          <div style={{ width: 260, background: T.white, borderRight: `1px solid ${T.border}`, padding: 16, overflowY: "auto", flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: T.text, textTransform: "uppercase" }}>Patient Profile</span>
              <button onClick={() => setShowProfile(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textL, fontSize: 18 }}>✕</button>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${T.teal}, ${T.blue})`, margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>👤</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{patient.name}</div>
              <div style={{ fontSize: 12, color: T.textM }}>{[patient.age && `${patient.age} yrs`, patient.gender].filter(Boolean).join(" • ")}</div>
            </div>
            {bmi && (
              <div style={{ background: T.tealXL, borderRadius: 8, padding: 8, textAlign: "center", border: `1px solid ${T.tealL}` }}>
                <div style={{ fontSize: 10, color: T.tealD, fontWeight: 600, textTransform: "uppercase" }}>BMI</div>
                <div style={{ fontWeight: 700, color: T.teal, fontSize: 16 }}>{bmi} <span style={{ fontSize: 11, fontWeight: 400 }}>({bmiCategory})</span></div>
              </div>
            )}
            {patient.bloodType && patient.bloodType !== "Unknown" && (
              <div style={{ background: T.blueL, borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: T.blueCard }}>Blood Type</span>
                <span style={{ fontWeight: 800, color: "#1E40AF" }}>{patient.bloodType}</span>
              </div>
            )}
            {patient.conditions?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: T.textM, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Conditions</div>
                {CONDITIONS_LIST.filter(c => patient.conditions.includes(c.id)).map((c, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#92400E", padding: "4px 9px", background: T.amberL, borderRadius: 6, marginBottom: 4 }}>{c.label}</div>
                ))}
              </div>
            )}
            {patient.allergies?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: T.textM, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Allergies</div>
                {patient.allergies.map((a, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#991B1B", padding: "4px 9px", background: T.redL, borderRadius: 6, marginBottom: 4 }}>{a}</div>
                ))}
              </div>
            )}
            <button onClick={() => { setScreen("onboarding"); setStep(1); setShowProfile(false); }}
              style={{ width: "100%", padding: "8px", border: `1.5px solid ${T.border}`, borderRadius: 10, background: T.white, color: T.textM, fontSize: 12, cursor: "pointer", marginTop: "auto" }}>
              ✏️ Update Profile
            </button>
          </div>
        )}

        {/* Chat History Sidebar */}
        {showHistory && (
          <div style={{ width: 270, background: T.white, borderRight: `1px solid ${T.border}`, padding: 16, overflowY: "auto", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: T.text, textTransform: "uppercase" }}>🕐 Chat History</span>
              <button onClick={() => setShowHistory(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textL, fontSize: 18 }}>✕</button>
            </div>
            {chatHistory.length === 0
              ? <p style={{ color: T.textL, fontSize: 13, textAlign: "center" }}>No saved chats yet</p>
              : chatHistory.map(chat => (
                <div key={chat._id}
                  style={{ padding: "10px 12px", border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 8, cursor: "pointer", background: T.bg, position: "relative" }}
                  onClick={() => { setMessages(chat.messages); setShowHistory(false); }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 24 }}>{chat.title}</div>
                  <div style={{ fontSize: 11, color: T.textL }}>{new Date(chat.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                  <button onClick={e => deleteChat(chat._id, e)}
                    style={{ position: "absolute", top: 8, right: 8, background: T.redL, border: "none", cursor: "pointer", color: T.red, fontSize: 14, width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    🗑
                  </button>
                </div>
              ))}
          </div>
        )}

        {/* Main Chat */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 10px" }}>
            {messages.map((msg, i) => <Bubble key={i} msg={msg} onFindNearby={findNearbyDoctors} onCopy={copyToClipboard} />)}
            {loading && <TypingIndicator />}
            {!loading && messages.length > 0 && (
              <div>
                {showPainScale && <PainScale onSelect={val => sendMessage(`My pain level is ${val}/10`)} />}
                {showDuration && <DurationSelector onSelect={d => sendMessage(`Duration: ${d}`)} />}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Symptom Chips */}
          <div style={{ background: T.white, borderTop: `1px solid ${T.border}`, padding: "10px 16px", overflowX: "auto", display: "flex", gap: 7, flexWrap: "nowrap", flexShrink: 0 }}>
            {QUICK_SYMPTOMS.map(s => (
              <button key={s} className="chip" onClick={() => sendMessage(s)} disabled={loading}
                style={{ padding: "5px 12px", border: `1px solid ${T.border}`, borderRadius: 20, background: T.white, color: T.textM, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, fontWeight: 500, transition: "all 0.15s" }}>
                {s}
              </button>
            ))}
          </div>

          {/* Tool Buttons */}
          <div style={{ background: T.white, borderTop: `1px solid ${T.border}`, padding: "8px 16px", display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
            <button onClick={() => { setShowPainScale(v => !v); setShowDuration(false); }} disabled={loading}
              style={{ padding: "6px 12px", border: `1.5px solid ${showPainScale ? T.teal : T.border}`, borderRadius: 8, background: showPainScale ? T.tealXL : T.white, color: showPainScale ? T.teal : T.textM, fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
              🩹 Pain Scale
            </button>
            <button onClick={() => { setShowDuration(v => !v); setShowPainScale(false); }} disabled={loading}
              style={{ padding: "6px 12px", border: `1.5px solid ${showDuration ? T.teal : T.border}`, borderRadius: 8, background: showDuration ? T.tealXL : T.white, color: showDuration ? T.teal : T.textM, fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
              ⏱ Duration
            </button>
            <button onClick={() => sendMessage("Yes")} disabled={loading}
              style={{ padding: "6px 12px", border: `1.5px solid ${T.border}`, borderRadius: 8, background: T.white, color: T.textM, fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
              ✅ Yes
            </button>
            <button onClick={() => sendMessage("No")} disabled={loading}
              style={{ padding: "6px 12px", border: `1.5px solid ${T.border}`, borderRadius: 8, background: T.white, color: T.textM, fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
              ❌ No
            </button>
            <button onClick={() => sendMessage("I don't know")} disabled={loading}
              style={{ padding: "6px 12px", border: `1.5px solid ${T.border}`, borderRadius: 8, background: T.white, color: T.textM, fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
              🤷 Not Sure
            </button>
            <button onClick={() => sendMessage("It's getting worse")} disabled={loading}
              style={{ padding: "6px 12px", border: `1.5px solid ${T.border}`, borderRadius: 8, background: T.white, color: T.textM, fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
              📈 Getting Worse
            </button>
            <button onClick={() => sendMessage("It's getting better")} disabled={loading}
              style={{ padding: "6px 12px", border: `1.5px solid ${T.border}`, borderRadius: 8, background: T.white, color: T.textM, fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
              📉 Getting Better
            </button>
            <button onClick={findNearbyDoctors}
              style={{ padding: "6px 12px", border: `1.5px solid ${T.border}`, borderRadius: 8, background: T.white, color: T.textM, fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
              📍 Nearby Doctors
            </button>
          </div>

          {/* Message Input */}
          <div style={{ background: T.white, borderTop: `1px solid ${T.border}`, padding: "12px 16px", display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
            <input ref={chatInputRef} value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Describe your symptoms or answer the doctor's question..."
              disabled={loading}
              style={{ flex: 1, padding: "11px 18px", border: `1.5px solid ${T.border}`, borderRadius: 26, fontSize: 14, outline: "none", background: T.bg, color: T.text, transition: "border-color 0.2s" }}
              onFocus={e => e.target.style.borderColor = T.teal}
              onBlur={e => e.target.style.borderColor = T.border} />
            <button onClick={() => sendMessage()} disabled={!chatInput.trim() || loading}
              style={{ width: 44, height: 44, borderRadius: "50%", background: chatInput.trim() && !loading ? T.teal : T.borderM, border: "none", cursor: chatInput.trim() && !loading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>
              ➤
            </button>
          </div>

          {/* Disclaimer */}
          <div style={{ background: T.amberL, borderTop: `1px solid ${T.amberM}`, padding: "6px 16px", textAlign: "center", fontSize: 11, color: "#92400E", flexShrink: 0 }}>
            ℹ️ For informational guidance only — not a substitute for professional medical advice. <strong>Emergency? Call <a href="tel:112">112</a> immediately.</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
