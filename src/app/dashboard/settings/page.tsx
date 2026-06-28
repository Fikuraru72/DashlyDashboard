"use client";

import React, { useState, useEffect } from "react";
import { Settings, User, Mail, Phone, Lock, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export default function SettingsPage() {
    const { user, fetchUser } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        password: ""
    });

    useEffect(() => {
        if (!user) {
            fetchUser();
        } else {
            setFormData({
                name: user.name || "",
                email: user.email || "",
                phone: user.phone || "",
                password: "" // Keep blank for security
            });
        }
    }, [user, fetchUser]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const tokenMatch = document.cookie.match(new RegExp('(^| )auth_token=([^;]+)'));
            const token = tokenMatch ? tokenMatch[2] : null;
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

            const payload: any = {
                name: formData.name,
                phone: formData.phone,
            };
            if (formData.password) {
                payload.password = formData.password;
            }

            const res = await fetch(`${apiUrl}/users/me`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Failed to update profile");
            }

            setSuccessMessage("Profile updated successfully!");
            setFormData(prev => ({ ...prev, password: "" })); // Clear password field
            fetchUser(); // Refresh global user state

            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err: any) {
            setErrorMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="flex-1 flex items-center justify-center p-8 h-full bg-slate-50 dark:bg-[#0f172a]">
                <div className="text-slate-500 font-medium animate-pulse tracking-widest uppercase text-sm">Loading Settings...</div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 dark:bg-[#0f172a] font-sans h-full">
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center shadow-inner">
                        <Settings className="h-6 w-6 text-indigo-600 dark:text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Account Settings</h1>
                        <p className="text-slate-500 text-sm mt-1 font-medium">Manage your personal information and security preferences.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Col: Nav / Info */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                    <span className="text-xl font-bold text-white uppercase">{user.name.charAt(0)}</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100">{user.name}</h3>
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{user.role?.name || "User"}</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <button className="w-full text-left px-4 py-2.5 rounded-xl font-bold text-sm bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-cyan-400 transition-colors">
                                    General Profile
                                </button>
                                <button className="w-full text-left px-4 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    Notifications
                                </button>
                                <button className="w-full text-left px-4 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    Privacy & Safety
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Col: Forms */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Personal Information</h2>
                            
                            {successMessage && (
                                <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                                    <CheckCircle2 className="w-5 h-5" />
                                    {successMessage}
                                </div>
                            )}

                            {errorMessage && (
                                <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle className="w-5 h-5" />
                                    {errorMessage}
                                </div>
                            )}

                            <form onSubmit={handleSaveProfile} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Name</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <User className="h-4 w-4 text-slate-400" />
                                            </div>
                                            <input 
                                                type="text" 
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow text-slate-800 dark:text-slate-200"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone Number</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Phone className="h-4 w-4 text-slate-400" />
                                            </div>
                                            <input 
                                                type="tel" 
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                placeholder="e.g. +62812..."
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow text-slate-800 dark:text-slate-200"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <input 
                                            type="email" 
                                            name="email"
                                            value={formData.email}
                                            disabled
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                                            title="Email cannot be changed"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium">Email address is used for authentication and cannot be changed.</p>
                                </div>

                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 mt-6 mb-2">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Security</h3>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">New Password</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-4 w-4 text-slate-400" />
                                            </div>
                                            <input 
                                                type="password" 
                                                name="password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                placeholder="Leave blank to keep current password"
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow text-slate-800 dark:text-slate-200"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 flex justify-end">
                                    <button 
                                        type="submit" 
                                        disabled={loading}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        <Save className="w-4 h-4" />
                                        {loading ? "Saving Changes..." : "Save Changes"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
