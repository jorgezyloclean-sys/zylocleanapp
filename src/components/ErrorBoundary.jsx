// Si una pantalla rompe, se muestra un aviso en vez de dejar la app en negro.
// React desmonta todo el árbol ante un error no atrapado; esto lo contiene.
import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("[app]", error, info?.componentStack); }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }

  render() {
    if (!this.state.error) return this.props.children;
    const { title, body, retry, reload } = this.props.labels || {};
    return (
      <div style={{ padding: 24, maxWidth: 520, margin: "40px auto", textAlign: "center" }}>
        <AlertTriangle size={36} color="var(--danger)" style={{ margin: "0 auto 12px" }} />
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{title}</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>{body}</p>
        <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 10, wordBreak: "break-word" }}>{String(this.state.error?.message || this.state.error)}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18 }}>
          <button className="btn-ghost" onClick={() => this.setState({ error: null })}>{retry}</button>
          <button className="btn-primary" onClick={() => window.location.reload()}><RefreshCw size={14} /> {reload}</button>
        </div>
      </div>
    );
  }
}
