"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Lock, Mail, ArrowRight, Zap, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Invalid credentials");
      }

      const data = await res.json();
      const token = data.accessToken;

      // ── RBAC Check: Only SUPER_ADMIN or STAFF can access the Dashboard ──
      const role = data.user?.role;
      if (role !== "SUPER_ADMIN" && role !== "STAFF") {
        throw new Error("Access Denied: Only administrators or staff can access this dashboard.");
      }

      // Set cookie for middleware access
      document.cookie = `auth_token=${token}; path=/; max-age=86400; SameSite=Lax`;

      // Redirect
      router.push("/dashboard/events");
    } catch (err: any) {
      setError(err.message || "An error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-50 font-sans selection:bg-indigo-500/30">
      
      {/* Left Panel: Branding / Visuals */}
      <div className="hidden lg:flex flex-col flex-1 relative bg-indigo-600 dark:bg-slate-900 overflow-hidden">
        {/* Abstract Background Patterns */}
        <div className="absolute inset-0 bg-[url('https://carto.com/help/images/tutorials/carto-js/carto-js-step1.png')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/90 to-blue-800/90 dark:from-indigo-900/90 dark:to-[#0f172a]/95"></div>
        
        {/* Dynamic Glowing Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-400/30 rounded-full mix-blend-screen filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/30 rounded-full mix-blend-screen filter blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="relative z-10 flex flex-col justify-center h-full p-16 xl:p-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/20 text-white">
              <Activity className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">Dashly</h1>
          </div>
          <h2 className="text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight mb-6">
            Real-time <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-300">Race Monitoring</span>
          </h2>
          <p className="text-lg text-indigo-100 dark:text-slate-300 max-w-md leading-relaxed font-medium">
            Track participants, detect anomalies instantly, and command the race from anywhere with military precision.
          </p>
          
          {/* Aesthetic Stats */}
          <div className="mt-16 flex items-center gap-8">
            <div>
              <div className="text-3xl font-black text-white">0s</div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-300 mt-1">Latency</div>
            </div>
            <div className="w-px h-10 bg-white/20"></div>
            <div>
              <div className="text-3xl font-black text-white">100%</div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-300 mt-1">Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 relative z-10 bg-white dark:bg-slate-950">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl text-indigo-600 dark:text-cyan-400">
              <Activity className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Dashly</h1>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Welcome Back</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Please enter your details to access the dashboard.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
                <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Email Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 pl-1">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:ring-cyan-500/20 dark:focus:border-cyan-500 transition-all outline-none"
                    placeholder="admin@dashly.com"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 pl-1">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:ring-cyan-500/20 dark:focus:border-cyan-500 transition-all outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-950 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
              <span className="relative flex items-center gap-2">
                {isLoading ? (
                  <>
                    <Zap className="animate-spin h-5 w-5" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Enter Command Center
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Prototype Credentials: <br/> 
              <span className="text-indigo-600 dark:text-cyan-400 font-bold">admin@dashly.com</span> / <span className="text-indigo-600 dark:text-cyan-400 font-bold">password123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
