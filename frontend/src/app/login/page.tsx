"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError("Email ou senha incorretos.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-brand-950 px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-52 top-[-22rem] h-[48rem] w-[48rem] rounded-full border-[110px] border-white/[0.025]" />
        <div className="absolute -right-48 bottom-[-24rem] h-[50rem] w-[50rem] rounded-full border-[120px] border-amber-400/[0.07]" />
        <div className="absolute inset-x-0 bottom-0 h-[46%] opacity-[0.08]" style={{
          backgroundImage: "repeating-linear-gradient(164deg, transparent 0 44px, rgba(255,255,255,.55) 45px 47px)",
        }} />
        <div className="absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600/20 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col">
        <header className="flex items-center justify-center sm:justify-start">
          <div className="flex items-center gap-3 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-amber-400 text-sm font-extrabold tracking-[-0.08em] shadow-lg shadow-black/20 ring-1 ring-white/15">
              JP
            </span>
            <div>
              <p className="text-sm font-extrabold leading-none tracking-wide">JP AGRO</p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-white/40">Grãos e Transporte</p>
            </div>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <section className="w-full max-w-[440px] animate-fade-up overflow-hidden rounded-[28px] bg-[#fffefb] shadow-[0_32px_90px_rgba(0,0,0,0.34)] ring-1 ring-white/10">
            <div className="h-1.5 bg-gradient-to-r from-brand-600 via-brand-400 to-amber-400" />

            <div className="px-7 pb-8 pt-7 sm:px-10 sm:pb-10 sm:pt-8">
              <div className="mb-5 flex justify-center">
                <img
                  src="/logo-jp-agro.png"
                  alt="JP Agro — Grãos e Transporte"
                  className="h-28 w-auto max-w-full object-contain mix-blend-multiply"
                />
              </div>

              <div className="mb-7 text-center">
                <h1 className="text-2xl font-extrabold tracking-[-0.035em] text-brand-950">Bem-vindo</h1>
                <p className="mt-2 text-sm leading-6 text-ink-3">Entre com seus dados para acessar o painel.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="mb-2 block text-xs font-bold text-ink-2">Email</label>
                  <div className="relative">
                    <svg className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5A2.25 2.25 0 0 1 19.5 19.5h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0-8.29 5.52a2.25 2.25 0 0 1-2.92 0L2.25 6.75" />
                    </svg>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="seu@email.com"
                      required
                      className="h-[52px] w-full rounded-xl border border-black/[0.09] bg-white pl-12 pr-4 text-sm text-ink outline-none transition placeholder:text-ink-4 hover:border-black/[0.16] focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-xs font-bold text-ink-2">Senha</label>
                  <div className="relative">
                    <svg className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 0 0-9 0v3.75m-.75 10.5h10.5a2.25 2.25 0 0 0 2.25-2.25v-6A2.25 2.25 0 0 0 17.25 10.5H6.75a2.25 2.25 0 0 0-2.25 2.25v6A2.25 2.25 0 0 0 6.75 21Z" />
                    </svg>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Digite sua senha"
                      required
                      className="h-[52px] w-full rounded-xl border border-black/[0.09] bg-white pl-12 pr-12 text-sm text-ink outline-none transition placeholder:text-ink-4 hover:border-black/[0.16] focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-4 transition hover:bg-brand-50 hover:text-brand-700"
                    >
                      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                        {showPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.52 10.52 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                        ) : (
                          <>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .638C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                {error && (
                  <div role="alert" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-extrabold">!</span>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-brand-700 text-sm font-bold text-white shadow-[0_10px_24px_rgba(22,82,48,0.2)] transition hover:bg-brand-800 hover:shadow-[0_13px_28px_rgba(22,82,48,0.28)] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Entrando…
                    </>
                  ) : (
                    <>
                      Acessar sistema
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-7 flex items-center justify-center gap-2 border-t border-black/[0.06] pt-5 text-[11px] font-medium text-ink-4">
                <svg className="h-3.5 w-3.5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m6-3c0 7.142-3.75 12-9 13.5-5.25-1.5-9-6.358-9-13.5 0-1.125.375-1.875 1.5-2.625C5.625 3.375 7.5 3 9 3c1.125 0 2.25.375 3 .75C12.75 3.375 13.875 3 15 3c1.5 0 3.375.375 4.5 1.125C20.625 4.875 21 5.625 21 6.75Z" />
                </svg>
                Acesso seguro e protegido
              </div>
            </div>
          </section>
        </div>

        <footer className="text-center text-[11px] font-medium text-white/25">
          © {new Date().getFullYear()} JP Agro · Grãos e Transporte
        </footer>
      </div>
    </main>
  );
}
