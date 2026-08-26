"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f3f0e6] px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 -top-28 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-[32rem] w-[32rem] rounded-full bg-brand-300/20 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: "radial-gradient(#0a2718 0.8px, transparent 0.8px)",
          backgroundSize: "24px 24px",
        }} />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_32px_90px_rgba(10,39,24,0.18)] lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative hidden min-h-[680px] overflow-hidden bg-brand-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border-[56px] border-amber-400/15" />
              <div className="absolute bottom-0 left-0 right-0 h-64 opacity-30" style={{
                backgroundImage: "repeating-linear-gradient(158deg, transparent 0 30px, rgba(255,255,255,.12) 31px 33px)",
              }} />
              <div className="absolute bottom-[-140px] right-[-80px] h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" />
            </div>

            <div className="relative flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                <svg className="h-5 w-5 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V9m0 0C9.5 9 7 7 7 4c2.5 0 5 2 5 5Zm0 4c2.5 0 5-2 5-5-2.5 0-5 2-5 5Z" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-bold tracking-wide">JP AGRO</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">Grãos e Transporte</p>
              </div>
            </div>

            <div className="relative max-w-md pb-10">
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Gestão que acompanha o campo</p>
              <h1 className="text-4xl font-extrabold leading-[1.12] tracking-[-0.04em] xl:text-5xl">
                Seus contratos,<br />cargas e resultados<br />em um só lugar.
              </h1>
              <p className="mt-6 max-w-sm text-sm leading-7 text-white/55">
                Controle cada etapa da operação com informações claras, cálculos confiáveis e visão completa do negócio.
              </p>
            </div>

            <div className="relative flex items-center gap-2 text-xs text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Ambiente seguro para sua operação
            </div>
          </div>

          <div className="flex min-h-[620px] items-center px-6 py-10 sm:px-12 lg:min-h-[680px] lg:px-16">
            <div className="mx-auto w-full max-w-sm animate-fade-up">
              <div className="mb-8 flex justify-center lg:justify-start">
                <img src="/logo-jp-agro.png" alt="JP Agro — Grãos e Transporte"
                  className="h-36 w-auto max-w-full object-contain mix-blend-multiply sm:h-40" />
              </div>

              <div className="mb-8">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">Bem-vindo de volta</p>
                <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.035em] text-brand-950">Acesse sua conta</h2>
                <p className="mt-2 text-sm leading-6 text-ink-3">Informe seus dados para entrar no painel de gestão.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="mb-2 block text-xs font-bold text-ink-2">Email</label>
                  <div className="relative">
                    <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5A2.25 2.25 0 0 1 19.5 19.5h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0-8.29 5.52a2.25 2.25 0 0 1-2.92 0L2.25 6.75" />
                    </svg>
                    <input id="email" type="email" autoComplete="email" placeholder="seu@email.com" value={email}
                      onChange={(e) => setEmail(e.target.value)} required
                      className="w-full rounded-xl border border-black/10 bg-[#fafaf8] py-3.5 pl-11 pr-4 text-sm text-ink outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10" />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-xs font-bold text-ink-2">Senha</label>
                  <div className="relative">
                    <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 0 0-9 0v3.75m-.75 10.5h10.5a2.25 2.25 0 0 0 2.25-2.25v-6A2.25 2.25 0 0 0 17.25 10.5H6.75a2.25 2.25 0 0 0-2.25 2.25v6A2.25 2.25 0 0 0 6.75 21Z" />
                    </svg>
                    <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Digite sua senha"
                      value={password} onChange={(e) => setPassword(e.target.value)} required
                      className="w-full rounded-xl border border-black/10 bg-[#fafaf8] py-3.5 pl-11 pr-12 text-sm text-ink outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10" />
                    <button type="button" onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-4 transition hover:bg-black/5 hover:text-ink-2"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        {showPassword
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.52 10.52 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                          : <><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .638C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></>}
                      </svg>
                    </button>
                  </div>
                </div>

                {error && (
                  <div role="alert" className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs">!</span>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(22,82,48,0.24)] transition hover:-translate-y-0.5 hover:bg-brand-800 hover:shadow-[0_14px_28px_rgba(22,82,48,0.3)] active:translate-y-0 disabled:pointer-events-none disabled:opacity-60">
                  {loading ? (
                    <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Entrando…</>
                  ) : (
                    <>Entrar no painel <span aria-hidden="true">→</span></>
                  )}
                </button>
              </form>

              <p className="mt-10 text-center text-[11px] font-medium text-ink-4 lg:text-left">
                © {new Date().getFullYear()} JP Agro · Grãos e Transporte
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
