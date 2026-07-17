"use client";

import React from "react";
import { X, User, Mail, Phone, Shield, Activity, Heart, AlertCircle } from "lucide-react";

interface UserData {
  id: number;
  email: string;
  name: string;
  phone?: string;
  role?: {
    id: number;
    name: string;
  };
  healthInfo?: Record<string, any> | null;
}

interface UserDetailModalProps {
  user: UserData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function UserDetailModal({ user, isOpen, onClose }: UserDetailModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none ${isOpen ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
      >
        <div
          className={`pointer-events-auto w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 transform transition-all duration-300 ease-out flex flex-col max-h-full ${isOpen ? "translate-y-0 scale-100" : "translate-y-8 scale-95"}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              User Profile
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          {user ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {/* Avatar & Basic Info */}
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 p-1 shadow-lg shadow-indigo-500/20">
                  <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center border-4 border-white dark:border-slate-900 overflow-hidden">
                    <User className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{user.name}</h3>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-cyan-400 text-xs font-semibold">
                    <Shield className="w-3.5 h-3.5" />
                    {user.role?.name || "No Role Assigned"}
                  </div>
                </div>
              </div>

              {/* Contact Details Card */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-4 shadow-sm">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Contact Information
                </h4>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0">
                    <Mail className="w-4 h-4 text-slate-500" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                    {user.email}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0">
                    <Phone className="w-4 h-4 text-slate-500" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {user.phone || "Not provided"}
                  </span>
                </div>
              </div>

              {/* Health Info Block */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-500" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Medical & Health Record
                  </h4>
                </div>

                {user.healthInfo ? (
                  <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm relative">
                    {/* Glassmorphism reflection */}
                    <div className="absolute inset-0 bg-white/40 dark:bg-black/10 pointer-events-none"></div>

                    <div className="relative p-5 space-y-4">
                      {Object.entries(user.healthInfo).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex flex-col border-b border-slate-100 dark:border-slate-800/60 pb-3 last:border-0 last:pb-0"
                        >
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            {key.replace(/_/g, " ")}
                          </span>
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1">
                            {typeof value === "boolean"
                              ? value
                                ? "Yes"
                                : "No"
                              : value?.toString() || "-"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20 text-center">
                    <Heart className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                      No health information recorded
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-slate-400 animate-pulse" />
            </div>
          )}

          {/* Footer Actions */}
          <div className="p-6 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900 rounded-b-3xl">
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
