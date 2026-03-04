"use client";

import React, { useState, useCallback } from "react";
import { useStore } from "@/lib/store";

export function UserSwitch() {
  const {
    currentUserId,
    users,
    setCurrentUserId,
    loginOrCreateUserByName,
    logoutToUserChooser,
  } = useStore();
  const [open, setOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [loading, setLoading] = useState(false);

  const currentUser = currentUserId
    ? users.find((u) => u.id === currentUserId)
    : null;
  const showChooser = !currentUserId;
  const showModal = open && currentUserId;

  const handleStart = useCallback(async () => {
    setLoading(true);
    try {
      await loginOrCreateUserByName(nameInput);
      setNameInput("");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, [loginOrCreateUserByName, nameInput]);

  const handleSelect = useCallback(
    (userId: string) => {
      setCurrentUserId(userId);
      setOpen(false);
    },
    [setCurrentUserId]
  );

  const handleLogout = useCallback(() => {
    logoutToUserChooser();
    setOpen(false);
  }, [logoutToUserChooser]);

  if (showChooser) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-chooser-title"
      >
        <div
          className="surface-app border border-app rounded-xl shadow-xl max-w-sm w-full mx-4 p-5"
          dir="rtl"
        >
          <h2 id="user-chooser-title" className="text-lg font-semibold text-app mb-4">
            בחר משתמש
          </h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              placeholder="הכנס את שמך"
              className="flex-1 border border-app rounded px-3 py-2 surface-app text-app text-sm"
            />
            <button
              type="button"
              disabled={loading}
              onClick={handleStart}
              className="px-4 py-2 btn-primary-app rounded-lg hover:opacity-90 disabled:opacity-50 text-sm"
            >
              התחל
            </button>
          </div>
          {users.length > 0 && (
            <ul className="space-y-2">
              {users.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(u.id)}
                    className="w-full text-right px-3 py-2 rounded-lg border border-app surface-app text-app hover:opacity-90"
                  >
                    {u.displayName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  if (showModal) {
    return (
      <>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-2 rounded-md border border-app px-3 py-2 text-sm surface-app text-app"
          >
            משתמש: {currentUser?.displayName ?? currentUserId}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-md border border-app px-3 py-2 text-sm surface-app text-app hover:opacity-90"
          >
            החלף משתמש
          </button>
        </div>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-switch-title"
        >
          <div
            className="surface-app border border-app rounded-xl shadow-xl max-w-sm w-full mx-4 p-5"
            dir="rtl"
          >
            <h2 id="user-switch-title" className="text-lg font-semibold text-app mb-4">
              בחר משתמש
            </h2>
            <ul className="space-y-2 mb-4">
              {users.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(u.id)}
                    className="w-full text-right px-3 py-2 rounded-lg border border-app surface-app text-app hover:opacity-90"
                  >
                    {u.displayName}
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="שם משתמש חדש"
                className="flex-1 border border-app rounded px-3 py-2 surface-app text-app text-sm"
              />
              <button
                type="button"
                disabled={loading}
                onClick={handleStart}
                className="px-4 py-2 btn-primary-app rounded-lg hover:opacity-90 disabled:opacity-50 text-sm"
              >
                צור והתחבר
              </button>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 w-full py-2 text-sm text-app opacity-80"
            >
              סגור
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-app px-3 py-2 text-sm surface-app text-app"
      >
        משתמש: {currentUser?.displayName ?? currentUserId}
      </button>
      <button
        type="button"
        onClick={handleLogout}
        className="inline-flex items-center gap-2 rounded-md border border-app px-3 py-2 text-sm surface-app text-app hover:opacity-90"
      >
        החלף משתמש
      </button>
    </div>
  );
}
