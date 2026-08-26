"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

const nav = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/contratos",
    label: "Contratos",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: "/carregamentos",
    label: "Carregamentos",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
  },
  {
    href: "/transacoes",
    label: "Transações",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    href: "/clientes",
    label: "Clientes",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: "/motoristas",
    label: "Motoristas",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const userInitial = session?.user?.name?.[0]?.toUpperCase() || "U";
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className="px-5 pt-7 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/10">
            <img src="/logo-jp-agro.png" alt="JP Agro" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-white font-bold text-[13px] leading-none tracking-tight">JP Agro</p>
            <p className="text-white/40 text-[11px] mt-0.5 font-medium">Grãos e Transporte</p>
          </div>
        </div>

      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-white/8 mb-3" />

      {/* Nav - flex-1 garante que o menu ocupe o espaço e empurre o footer para baixo */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        <p className="px-3.5 py-2 text-2xs font-bold text-white/25 uppercase tracking-widest">
          Menu
        </p>
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`sidebar-link ${isActive(item.href) ? "sidebar-link-active" : "sidebar-link-idle"}`}
          >
            <span className={`flex-shrink-0 ${isActive(item.href) ? "text-white" : "text-white/45"}`}>
              {item.icon}
            </span>
            <span>{item.label}</span>
            {isActive(item.href) && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-300 flex-shrink-0" />
            )}
          </Link>
        ))}
      </nav>

      {/* Footer / user - Fixado no rodapé */}
      <div className="px-3 pb-6 pt-4 mt-auto">
        <div className="mx-3 h-px bg-white/8 mb-6" />
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-900/50">
              <span className="text-white text-sm font-bold">{userInitial}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[13px] font-bold truncate leading-none">{session?.user?.name}</p>
              <p className="text-white/40 text-[11px] mt-1 font-medium">
                {isAdmin ? "Administrador" : "Operacional"}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 text-white/60 hover:text-red-400 text-[11px] font-bold uppercase tracking-wider transition-all border border-white/5 hover:border-red-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 bg-brand-800 text-white rounded-xl flex items-center justify-center shadow-card-md"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed top-0 left-0 h-full w-64 z-50 transform transition-transform duration-300 ease-apple
          bg-brand-900`}
        style={{ transform: mobileOpen ? "translateX(0)" : "translateX(-100%)" }}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-5 right-4 w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-60 min-h-screen fixed top-0 left-0 bg-brand-900"
        style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
