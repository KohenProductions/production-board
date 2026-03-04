"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type User = {
  id: string;
  username: string;
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  age?: number | null;
  email?: string | null;
  phone?: string | null;
  instagram?: string | null;
  facebook?: string | null;
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        const u = data?.user;
        if (u) {
          setUser(u);
          setFirstName(u.firstName ?? "");
          setLastName(u.lastName ?? "");
          setEmail(u.email ?? "");
          setPhone(u.phone ?? "");
          setInstagram(u.instagram ?? "");
          setFacebook(u.facebook ?? "");
          setAvatarUrl(u.avatarUrl ?? "");
          setAge(u.age != null ? String(u.age) : "");
        }
      });
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    setProfileBusy(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: firstName || null,
          lastName: lastName || null,
          age: age === "" ? null : parseInt(age, 10),
          email: email || null,
          phone: phone || null,
          instagram: instagram || null,
          facebook: facebook || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfileError(data?.error ?? "שמירה נכשלה");
        return;
      }
      setProfileSuccess(true);
    } finally {
      setProfileBusy(false);
    }
  }

  async function saveAvatar(e: React.FormEvent) {
    e.preventDefault();
    setAvatarError(null);
    setAvatarSuccess(false);
    setAvatarBusy(true);
    try {
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ avatarUrl: avatarUrl || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAvatarError(data?.error ?? "שמירת אווטר נכשלה");
        return;
      }
      setAvatarSuccess(true);
      setUser((prev) => (prev ? { ...prev, avatarUrl: data?.avatarUrl ?? avatarUrl } : null));
    } finally {
      setAvatarBusy(false);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-app opacity-70">טוען...</p>
      </div>
    );
  }

  const inputClass =
    "w-full border border-app rounded-lg px-3 py-2 bg-app text-app text-sm";

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="text-sm text-app opacity-80 hover:opacity-100"
        >
          ← חזרה
        </Link>
        <h1 className="text-xl font-bold">עריכת פרופיל</h1>
      </div>

      <section className="surface-app border border-app rounded-xl p-4 space-y-4">
        <h2 className="font-bold text-base">פרטים אישיים</h2>
        <form onSubmit={saveProfile} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">שם פרטי</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass}
              placeholder="שם פרטי"
              disabled={profileBusy}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">שם משפחה</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
              placeholder="שם משפחה"
              disabled={profileBusy}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">גיל</label>
            <input
              type="number"
              min={0}
              max={150}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className={inputClass}
              placeholder="גיל"
              disabled={profileBusy}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">אימייל</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="דוא״ל"
              disabled={profileBusy}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">טלפון</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              placeholder="טלפון"
              disabled={profileBusy}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">אינסטגרם</label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className={inputClass}
              placeholder="אינסטגרם"
              disabled={profileBusy}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">פייסבוק</label>
            <input
              type="text"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              className={inputClass}
              placeholder="פייסבוק"
              disabled={profileBusy}
            />
          </div>
          {profileError && (
            <p className="text-red-600 text-sm">{profileError}</p>
          )}
          {profileSuccess && (
            <p className="text-green-600 text-sm">הפרטים נשמרו בהצלחה.</p>
          )}
          <button
            type="submit"
            disabled={profileBusy}
            className="btn-primary-app disabled:opacity-50"
          >
            {profileBusy ? "שומר..." : "שמור פרטים"}
          </button>
        </form>
      </section>

      <section className="surface-app border border-app rounded-xl p-4 space-y-4">
        <h2 className="font-bold text-base">תמונת פרופיל (URL)</h2>
        <form onSubmit={saveAvatar} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">קישור לתמונה</label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className={inputClass}
              placeholder="https://..."
              disabled={avatarBusy}
            />
          </div>
          {avatarError && (
            <p className="text-red-600 text-sm">{avatarError}</p>
          )}
          {avatarSuccess && (
            <p className="text-green-600 text-sm">תמונת הפרופיל נשמרה.</p>
          )}
          <button
            type="submit"
            disabled={avatarBusy}
            className="btn-primary-app disabled:opacity-50"
          >
            {avatarBusy ? "שומר..." : "שמור תמונת פרופיל"}
          </button>
        </form>
      </section>
    </div>
  );
}
