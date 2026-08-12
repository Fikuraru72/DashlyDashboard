"use client";

import React, { useEffect, useState } from "react";
import { Search, UserPlus, X, Check, AlertCircle, Loader2, UserCheck, ShieldCheck } from "lucide-react";
import { authenticatedFetch } from "@/lib/api";

interface AddExistingParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  existingParticipantUserIds: number[];
  onSuccess: () => void;
  apiUrl: string;
}

export default function AddExistingParticipantModal({
  isOpen,
  onClose,
  eventId,
  existingParticipantUserIds,
  onSuccess,
  apiUrl,
}: AddExistingParticipantModalProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const existingSet = new Set(existingParticipantUserIds);

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift();
    return null;
  };

  useEffect(() => {
    if (!isOpen) return;

    const fetchAllUsers = async () => {
      setLoading(true);
      setError("");
      try {
        const token = getCookie("auth_token");
        const res = await authenticatedFetch(`${apiUrl}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error("Gagal mengambil data user terdaftar");
        }

        const data = await res.json();
        const userList = Array.isArray(data) ? data : data.data || [];
        setUsers(userList);
      } catch (err: any) {
        setError(err.message || "Terjadi kesalahan saat memuat data user");
      } finally {
        setLoading(false);
      }
    };

    void fetchAllUsers();
    setSelectedUserIds([]);
    setSearchQuery("");
  }, [isOpen, apiUrl]);

  if (!isOpen) return null;

  // Filter users based on search query
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = u.name?.toLowerCase().includes(q);
    const emailMatch = u.email?.toLowerCase().includes(q);
    const phoneMatch = u.phone?.toLowerCase().includes(q);
    return nameMatch || emailMatch || phoneMatch;
  });

  const availableUsers = filteredUsers.filter((u) => !existingSet.has(u.id));
  const isAllAvailableSelected =
    availableUsers.length > 0 && availableUsers.every((u) => selectedUserIds.includes(u.id));

  const handleToggleSelectAll = () => {
    if (isAllAvailableSelected) {
      const availableSet = new Set(availableUsers.map((u) => u.id));
      setSelectedUserIds((prev) => prev.filter((id) => !availableSet.has(id)));
    } else {
      const availableIds = availableUsers.map((u) => u.id);
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...availableIds])));
    }
  };

  const handleToggleUser = (userId: number) => {
    if (existingSet.has(userId)) return;
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (selectedUserIds.length === 0) return;
    setIsSubmitting(true);
    setError("");

    try {
      const token = getCookie("auth_token");
      const res = await fetch(`${apiUrl}/events/${eventId}/participants/batch-add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIds: selectedUserIds }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Gagal menambahkan peserta ke event");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan peserta ke event");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
              <UserPlus size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                Tambah Peserta Terdaftar
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Cari dan pilih akun terdaftar di sistem untuk dimasukkan ke event ini
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan nama peserta, email, atau no hp..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all font-medium"
            />
          </div>

          <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                disabled={availableUsers.length === 0}
                className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50 disabled:no-underline"
              >
                <input
                  type="checkbox"
                  checked={isAllAvailableSelected}
                  onChange={handleToggleSelectAll}
                  disabled={availableUsers.length === 0}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                Pilih Semua yang Tersedia ({availableUsers.length})
              </button>
            </div>
            <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-bold">
              Terpilih: {selectedUserIds.length} peserta
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Users List Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <Loader2 size={32} className="animate-spin mx-auto text-indigo-500" />
              <p className="text-xs font-semibold">Memuat daftar akun terdaftar...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <UserCheck size={36} className="mx-auto opacity-30" />
              <p className="text-sm font-bold">Tidak ada akun terdaftar yang ditemukan</p>
              <p className="text-xs">Coba kata kunci pencarian yang lain.</p>
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isAlreadyAdded = existingSet.has(u.id);
              const isSelected = selectedUserIds.includes(u.id);

              return (
                <div
                  key={u.id}
                  onClick={() => !isAlreadyAdded && handleToggleUser(u.id)}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isAlreadyAdded
                      ? "bg-slate-50/70 dark:bg-slate-950/40 border-slate-200/50 dark:border-slate-800/50 opacity-60 cursor-not-allowed"
                      : isSelected
                      ? "bg-indigo-50/80 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 cursor-pointer shadow-sm"
                      : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected || isAlreadyAdded}
                      disabled={isAlreadyAdded}
                      onChange={() => handleToggleUser(u.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                          {u.name || "Peserta"}
                        </span>
                        {u.role?.name && u.role.name !== "PARTICIPANT" && (
                          <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[9px] font-black rounded uppercase">
                            {u.role.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="truncate">{u.email}</span>
                        {u.phone && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[11px]">{u.phone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isAlreadyAdded ? (
                      <span className="px-2.5 py-1 bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck size={12} /> Sudah Masuk
                      </span>
                    ) : isSelected ? (
                      <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Check size={12} /> Terpilih
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                        + Tambah
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {selectedUserIds.length > 0 ? (
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {selectedUserIds.length} peserta siap dimasukkan
              </span>
            ) : (
              "Pilih minimal 1 peserta dari daftar"
            )}
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedUserIds.length === 0 || isSubmitting}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Menambahkan...
                </>
              ) : (
                <>
                  <UserPlus size={14} /> Tambahkan ({selectedUserIds.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
