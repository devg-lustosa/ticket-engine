"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, Settings, Ticket, LogOut, LayoutDashboard, ScanLine, ChevronDown } from "lucide-react";

interface UserNavProps {
  user: {
    name: string;
    email: string;
  } | null;
  role?: string | null;
}

export function UserNav({ user, role }: UserNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPainelOpen, setIsPainelOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (painelRef.current && !painelRef.current.contains(event.target as Node)) {
        setIsPainelOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isStaff = role === "STAFF" || role === "ORGANIZER";

  if (!user) {
    return (
      <Link
        href="/login"
        className="px-4 py-2 text-sm font-medium text-white bg-black/20 hover:bg-black/30 rounded-full transition-colors"
      >
        Entrar
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Botão Painel — visível apenas para STAFF/ORGANIZER */}
      {isStaff && (
        <div className="relative" ref={painelRef}>
          <button
            onClick={() => setIsPainelOpen(!isPainelOpen)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-black/20 hover:bg-black/30 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <LayoutDashboard size={14} />
            <span className="hidden sm:inline-block">Painel</span>
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${isPainelOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isPainelOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-1">
                <Link
                  href="/painel"
                  onClick={() => setIsPainelOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LayoutDashboard size={16} className="text-gray-500" />
                  <div>
                    <p className="font-medium">Dashboard</p>
                    <p className="text-xs text-gray-400">Gerenciar eventos</p>
                  </div>
                </Link>
                <Link
                  href="/portaria"
                  onClick={() => setIsPainelOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ScanLine size={16} className="text-gray-500" />
                  <div>
                    <p className="font-medium">Scanner da Portaria</p>
                    <p className="text-xs text-gray-400">Validar QR codes</p>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botão de perfil do usuário */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-black/20 hover:bg-black/30 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
        >
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <User size={14} />
          </div>
          <span className="hidden sm:inline-block max-w-[120px] truncate">{user.name}</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <div className="p-1">
              <Link
                href="/meus-ingressos"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Ticket size={16} />
                Meus Ingressos
              </Link>
              <Link
                href="/perfil"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings size={16} />
                Configurar Conta
              </Link>
              <div className="h-px bg-gray-100 my-1 mx-2" />
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="flex items-center w-full gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut size={16} />
                  Sair da Conta
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
