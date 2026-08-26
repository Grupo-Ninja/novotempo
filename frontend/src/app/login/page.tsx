"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Email ou senha incorretos.");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-brand-950 flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background texture */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-800/25 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-brand-700/15 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="w-full max-w-sm relative animate-fade-up">

        {/* Card */}
        <div
          className="rounded-3xl p-8"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset",
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-full h-28 rounded-2xl flex items-center justify-center overflow-hidden bg-white shadow-xl p-3"
              style={{ border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <img src="/logo-novo-tempo.svg" alt="Novo Tempo Corretora de Grãos" className="w-full h-full object-contain" />
            </div>
          </div>


          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-2 tracking-wide uppercase">
                Email
              </label>
              <input
                type="email"
                className="w-full text-sm text-white placeholder:text-white/20 px-4 py-3 rounded-xl
                           outline-none transition-all duration-150"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                onFocus={e => {
                  e.currentTarget.style.border = "1px solid rgba(78,163,110,0.6)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                }}
                onBlur={e => {
                  e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }}
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/50 mb-2 tracking-wide uppercase">
                Senha
              </label>
              <input
                type="password"
                className="w-full text-sm text-white placeholder:text-white/20 px-4 py-3 rounded-xl
                           outline-none transition-all duration-150"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                onFocus={e => {
                  e.currentTarget.style.border = "1px solid rgba(78,163,110,0.6)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                }}
                onBlur={e => {
                  e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-red-300 text-sm"
                style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl font-semibold text-sm text-white
                         transition-all duration-150 active:scale-[0.98]
                         disabled:opacity-50 disabled:pointer-events-none"
              style={{
                background: "linear-gradient(135deg, #2D8653 0%, #1E6B3F 100%)",
                boxShadow: "0 4px 16px rgba(45,134,83,0.35), 0 1px 0 rgba(255,255,255,0.1) inset",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Entrando…
                </span>
              ) : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center text-white/20 text-xs mt-6 font-medium">
          Novo Tempo © {new Date().getFullYear()}
        </p>

      </div>
    </div>
  );
}
