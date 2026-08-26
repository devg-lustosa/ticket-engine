"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, Settings, Ticket, LogOut } from "lucide-react";

interface UserNavProps {
  user: {
    name: string;
    email: string;
  } | null;
}

export function UserNav({ user }: UserNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
  );
}
