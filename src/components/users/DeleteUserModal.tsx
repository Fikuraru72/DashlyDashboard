"use client";

import React, { useState } from "react";
import { AlertTriangle, Trash2, UserMinus, X } from "lucide-react";

interface DeleteUserModalProps {
  isOpen: boolean;
  userCount: number;
  userName?: string;
  onClose: () => void;
  onConfirmDeleteAccount: () => Promise<void>;
  onConfirmRemoveFromEvent?: () => Promise<void>;
}

export function DeleteUserModal({
  isOpen,
  userCount,
  userName,
  onClose,
  onConfirmDeleteAccount,
  onConfirmRemoveFromEvent,
}: DeleteUserModalProps) {
  const [selectedOption, setSelectedOption] = useState<"FULL_DELETE" | "EVENT_REMOVE">(
    "FULL_DELETE",
  );
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      if (selectedOption === "FULL_DELETE") {
        await onConfirmDeleteAccount();
      } else if (selectedOption === "EVENT_REMOVE" && onConfirmRemoveFromEvent) {
        await onConfirmRemoveFromEvent();
      }
      onClose();
    } catch (err) {
      console.error("Error executing delete option:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
                  {userCount > 1
                    ? `Opsi Hapus ${userCount} User Terpilih`
                    : `Opsi Hapus User: ${userName || "User"}`}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Pilih metode penghapusan yang Anda inginkan
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

          {/* Body Options */}
          <div className="p-6 space-y-4">
            {/* Option 1: Full Delete */}
            <div
              onClick={() => setSelectedOption("FULL_DELETE")}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
                selectedOption === "FULL_DELETE"
                  ? "border-rose-500 bg-rose-50/50 dark:bg-rose-500/10 shadow-sm"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
              }`}
            >
              <div
                className={`p-2.5 rounded-xl ${
                  selectedOption === "FULL_DELETE"
                    ? "bg-rose-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}
              >
                <Trash2 size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    Option 1: Hapus Akun & Seluruh Data (Permanen)
                  </h4>
                  <input
                    type="radio"
                    name="delete_option"
                    checked={selectedOption === "FULL_DELETE"}
                    onChange={() => setSelectedOption("FULL_DELETE")}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Menghapus akun user dari database beserta seluruh profil kesehatan, pendaftaran event, dan log riwayat aktivitasnya.
                </p>
              </div>
            </div>

            {/* Option 2: Event Unregister Only (If applicable) */}
            {onConfirmRemoveFromEvent && (
              <div
                onClick={() => setSelectedOption("EVENT_REMOVE")}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
                  selectedOption === "EVENT_REMOVE"
                    ? "border-amber-500 bg-amber-50/50 dark:bg-amber-500/10 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl ${
                    selectedOption === "EVENT_REMOVE"
                      ? "bg-amber-500 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  <UserMinus size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      Option 2: Keluarkan dari Event Saja
                    </h4>
                    <input
                      type="radio"
                      name="delete_option"
                      checked={selectedOption === "EVENT_REMOVE"}
                      onChange={() => setSelectedOption("EVENT_REMOVE")}
                      className="w-4 h-4 text-amber-500 focus:ring-amber-500"
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Hanya membatalkan pendaftaran user dari event ini. Akun user dan profilnya tetap ada di sistem.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleConfirm}
              disabled={isDeleting}
              className={`px-5 py-2.5 rounded-xl shadow-md text-xs font-bold text-white transition-all flex items-center gap-2 ${
                selectedOption === "FULL_DELETE"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              {isDeleting ? "Memproses..." : "Konfirmasi & Proses Hapus"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
