"use client";

import { useEffect, useRef, useState } from "react";
import { AuthLogoutButton } from "@/components/AuthLogoutButton";

type User = {
  id: string;
  username: string;
  avatarUrl?: string | null;
};

export function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setUser(data?.user ?? null);
      });
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleAfterLogout() {
    setUser(null);
    setOpen(false);
  }

  if (!user) return null;

  const initial = user.username?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="relative flex justify-end" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="focus:outline-none rounded-full border border-app focus:ring-2 focus:ring-offset-2 focus:ring-offset-app focus:ring-white/30"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            className="w-8 h-8 rounded-full object-cover border border-app"
            alt=""
          />
        ) : (
          <div className="w-8 h-8 rounded-full border border-app flex items-center justify-center text-sm font-semibold bg-app hover:bg-white/10 transition-colors">
            {initial}
          </div>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-2 min-w-[200px] py-2 px-3 rounded-lg border border-app bg-app shadow-lg z-30"
          role="menu"
        >
          <p className="text-sm opacity-90 px-1 pb-2 border-b border-app/50 mb-2">
            מחובר בתור: <span className="font-medium">{user.username}</span>
          </p>
          <div role="none">
            <AuthLogoutButton onAfterLogout={handleAfterLogout} />
          </div>
        </div>
      )}
    </div>
  );
}
