"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type User = {
  id: string;
  username: string;
  avatarUrl?: string | null;
};

export function AuthUserBadge() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user);
      });
  }, []);

  if (!user) return null;

  const initial = user.username?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex justify-end">
      <Link href="/profile" className="block">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            className="w-8 h-8 rounded-full object-cover border border-app"
            alt="avatar"
          />
        ) : (
          <div className="w-8 h-8 rounded-full border border-app flex items-center justify-center text-sm font-semibold">
            {initial}
          </div>
        )}
      </Link>
    </div>
  );
}