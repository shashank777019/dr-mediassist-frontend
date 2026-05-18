import React, { useState } from "react";

const T = {
  teal: "#0D9488", tealD: "#0F766E", tealL: "#CCFBF1", tealXL: "#F0FDFA",
  blue: "#0891B2", bg: "#F1F5F9", white: "#FFFFFF",
  text: "#0F172A", textM: "#64748B", textL: "#94A3B8",
  border: "#E2E8F0", red: "#DC2626", redL: "#FEF2F2",
};

const API = "http://localhost:5000/api";

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async () => {
    setError("");
    if (!form.email || !form.password) return setError("Please fill all fields");
    if (mode === "signup" && !form.name) return setError("Please enter your name");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) return setError(data.error);
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("userName", data.name);
      onLogin(data);
    } catch {
      setError("Server error. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg, ${T.teal} 0%, ${T.blue} 55%, #1E3A8A 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: T.white, borderRadius: 24, width: "100%", maxWidth: 420, overflow: "hidden", boxShadow: "0 32px 64px rgba(0,0,0,0.2)" }}>
        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${T.teal}, ${T.blue})`, padding: "28px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 52, height: 52, background: "rgba(255,255,255,0.18)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ti ti-first-aid-kit" style={{ color: "white", fontSize: 26 }} />
            </div>
            <div>
              <h1 style={{ color: "white", margin: 0, fontSize: 22, fontWeight: 800 }}>Dr. MediAssist</h1>
              <p style={{ color: "rgba(255,255,255,0.78)", margin: 0, fontSize: 13 }}>Your AI Health Companion</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: "28px 32px" }}>
          {/* Toggle */}
          <div style={{ display: "flex", background: T.bg, borderRadius: 12, padding: 4, marginBottom: 24 }}>
            {["login", "signup"].map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{ flex: 1, padding: "9px", borderRadius: 10, border: "none", background: mode === m ? T.white : "transparent", color: mode === m ? T.teal : T.textM, fontWeight: mode === m ? 700 : 500, fontSize: 14, cursor: "pointer", boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.2s" }}>
                {m === "login" ? "Login" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "signup" && (
              <div>
                <label style={{ fontSize: 13, color: T.textM, display: "block", marginBottom: 5, fontWeight: 500 }}>Full Name</label>
                <input value={form.name} onChange={handle("name")} placeholder="Enter your full name"
                  style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", color: T.text }} />
              </div>
            )}
            <div>
              <label style={{ fontSize: 13, color: T.textM, display: "block", marginBottom: 5, fontWeight: 500 }}>Email</label>
              <input type="email" value={form.email} onChange={handle("email")} placeholder="Enter your email"
                style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", color: T.text }} />
            </div>
            <div>
              <label style={{ fontSize: 13, color: T.textM, display: "block", marginBottom: 5, fontWeight: 500 }}>Password</label>
              <input type="password" value={form.password} onChange={handle("password")} placeholder="Enter your password"
                onKeyDown={(e) => e.key === "Enter" && submit()}
                style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", color: T.text }} />
            </div>

            {error && (
              <div style={{ background: T.redL, border: `1px solid #FCA5A5`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: T.red, fontWeight: 500 }}>
                <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />{error}
              </div>
            )}

            <button onClick={submit} disabled={loading}
              style={{ padding: "13px", border: "none", borderRadius: 12, background: `linear-gradient(135deg, ${T.teal}, ${T.blue})`, color: "white", fontSize: 15, cursor: loading ? "not-allowed" : "pointer", fontWeight: 700, marginTop: 4, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Please wait..." : mode === "login" ? "Login to Dr. MediAssist" : "Create Account"}
            </button>
          </div>

          <p style={{ textAlign: "center", fontSize: 13, color: T.textM, marginTop: 20 }}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
              style={{ color: T.teal, fontWeight: 600, cursor: "pointer" }}>
              {mode === "login" ? "Sign Up" : "Login"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
