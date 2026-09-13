import { useState } from "react";
import { AlertTriangle, Eye, EyeOff, KeyRound, Lock, Mail, RefreshCw } from "lucide-react";
import zyloLogo from "../assets/zylo-logo-header.svg";
import { C, Field, LangSwitch, ThemeSwitch } from "../components/ui.jsx";
import { useT } from "../i18n/index.jsx";

export default function LoginScreen({ onLogin, notStaff, onLogout }) {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !pass) { setError(t("login.required")); return; }
    setLoading(true); setError("");
    try {
      await onLogin(email.trim(), pass);
    } catch (err) {
      setError(/invalid|credentials/i.test(err.message) ? t("login.error") : err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, padding: 16, position: "relative", overflow: "hidden" }}>
      <div aria-hidden className="login-blobs" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: -120, left: -80, width: 400, height: 400, borderRadius: "50%", background: C.primary, opacity: .16, filter: "blur(80px)" }} />
        <div style={{ position: "absolute", bottom: -100, right: -60, width: 360, height: 360, borderRadius: "50%", background: C.bright, opacity: .12, filter: "blur(80px)" }} />
      </div>

      <div style={{ position: "absolute", top: 14, right: 14, display: "flex", gap: 10, alignItems: "center", color: C.muted }}>
        <LangSwitch compact /><ThemeSwitch />
      </div>

      <div className="animate-fadeUp" style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src={zyloLogo} alt="ZyloClean" width={180} height={40} style={{ height: 40, width: "auto" }} />
          <p style={{ color: C.muted, fontSize: 13, marginTop: 8 }}>{t("login.title")}</p>
        </div>

        <div style={{ background: C.surface, borderRadius: 20, boxShadow: "var(--shadow-lg)", border: `1px solid ${C.border}`, padding: 26 }}>
          {notStaff ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="banner warn"><AlertTriangle size={15} /><span>{t("login.notStaff")}</span></div>
              <button className="btn-ghost" onClick={onLogout} style={{ justifyContent: "center" }}>{t("common.logout")}</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }} noValidate>
              <Field label={t("login.email")} htmlFor="login-email">
                <div style={{ position: "relative" }}>
                  <Mail size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                  <input id="login-email" type="email" autoComplete="username" inputMode="email" className="input-base" value={email}
                    onChange={(e) => setEmail(e.target.value)} placeholder="nombre@ejemplo.com" style={{ paddingLeft: 36 }} />
                </div>
              </Field>
              <Field label={t("login.password")} htmlFor="login-pass">
                <div style={{ position: "relative" }}>
                  <Lock size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                  <input id="login-pass" type={show ? "text" : "password"} autoComplete="current-password" className="input-base" value={pass}
                    onChange={(e) => setPass(e.target.value)} placeholder="••••••••" style={{ paddingLeft: 36, paddingRight: 44 }} />
                  <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? t("login.hidePassword") : t("login.showPassword")}
                    style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)" }}>
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
              {error && <div role="alert" style={{ display: "flex", alignItems: "center", gap: 6, color: C.dangerInk, fontSize: 12.5, fontWeight: 500 }}><AlertTriangle size={13} /> {error}</div>}
              <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
                {loading ? <RefreshCw size={15} className="animate-spin" /> : <KeyRound size={15} />}
                {loading ? t("login.submitting") : t("login.submit")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
