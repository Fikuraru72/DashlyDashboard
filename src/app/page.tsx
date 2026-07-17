"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import {
  Activity,
  ArrowRight,
  ShieldAlert,
  Zap,
  MapPin,
  Calendar,
  Users,
  Smartphone,
  Globe,
  Mail,
} from "lucide-react";

interface PublicEvent {
  id: number;
  name: string;
  status: string;
  dateEvent?: string;
  city?: string;
  province?: string;
  currentCount?: number;
  maxParticipants?: number;
  category?: string;
  banner?: string;
  registrationStatus?: string;
  description?: string;
  locationName?: string;
}

export default function LandingPage() {
  const { data: events = [], isPending: loading } = useQuery({
    queryKey: ["public-events"],
    queryFn: async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/public-events`);
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();
      return (data.success ? data.data : Array.isArray(data) ? data : []) as PublicEvent[];
    },
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <Activity className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Dashly</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#about"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              About
            </a>
            <a
              href="#features"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#events"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Events
            </a>
            <a
              href="#contact"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Contact
            </a>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-300 hover:text-white hidden md:block transition-colors"
            >
              Organizer Login
            </Link>
            <a
              href="#download"
              className="px-5 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-full text-sm font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.5)]"
            >
              Get App
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/20 to-slate-950"></div>
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/30 rounded-full mix-blend-screen filter blur-[120px] animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-600/20 rounded-full mix-blend-screen filter blur-[120px] animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Next-Gen Race Tracking
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 leading-[1.1]">
            Command the race with <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">
              Military Precision
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 mb-10 leading-relaxed">
            Dashly brings real-time GPS tracking, anomaly detection, and instant emergency responses
            to your fingertips. The ultimate companion for endurance events.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#download"
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold text-lg transition-all shadow-[0_0_30px_rgba(79,70,229,0.4)] hover:shadow-[0_0_40px_rgba(79,70,229,0.6)] hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              Download APK <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="#events"
              className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full font-bold text-lg transition-all backdrop-blur-sm"
            >
              View Upcoming Events
            </a>
          </div>
        </div>
      </section>

      {/* ── About Section ── */}
      <section id="about" className="py-24 relative z-10 border-t border-white/5 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-black mb-6">
                Built for <span className="text-indigo-400">Safety</span> &{" "}
                <span className="text-cyan-400">Performance</span>.
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-6">
                Endurance racing pushes human limits. When athletes are out on the trail, every
                second counts. Dashly was built to ensure no runner goes untracked, and no emergency
                goes unnoticed.
              </p>
              <ul className="space-y-4">
                {[
                  "Real-time coordinate syncing via MQTT.",
                  "Offline buffering when cellular signals drop.",
                  "Instant SOS triggers for immediate medical response.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300">
                    <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative aspect-square md:aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              <Image
                src="https://images.unsplash.com/photo-1541252874014-4166bf2a64c8?auto=format&fit=crop&q=80"
                alt="Runners on a trail"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section id="features" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-6">Powerful Features</h2>
            <p className="text-slate-400 text-lg">
              Everything you need to monitor, manage, and execute flawless racing events.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: MapPin,
                title: "Live Tracking",
                desc: "Track every participant on a unified geographic map with sub-second latency.",
                color: "text-indigo-400",
                bg: "bg-indigo-500/10",
              },
              {
                icon: ShieldAlert,
                title: "Anomaly Detection",
                desc: "Automated alerts for stationary participants or route deviations.",
                color: "text-rose-400",
                bg: "bg-rose-500/10",
              },
              {
                icon: Smartphone,
                title: "Mobile Ready",
                desc: "Participant companion app for registration, QR tickets, and live tracking.",
                color: "text-cyan-400",
                bg: "bg-cyan-500/10",
              },
              {
                icon: Zap,
                title: "Offline Syncing",
                desc: "GPS coordinates are cached locally and synced instantly upon reconnection.",
                color: "text-amber-400",
                bg: "bg-amber-500/10",
              },
              {
                icon: Users,
                title: "Dynamic Quotas",
                desc: "Real-time registration caps and automatic enrollment closure.",
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
              },
              {
                icon: Activity,
                title: "Dashboard Command",
                desc: "A central hub for race organizers to monitor health and progress.",
                color: "text-purple-400",
                bg: "bg-purple-500/10",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors hover:-translate-y-1 duration-300"
              >
                <div
                  className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6`}
                >
                  <feature.icon className={`w-7 h-7 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Upcoming Events ── */}
      <section id="events" className="py-24 relative z-10 border-t border-white/5 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-3xl md:text-5xl font-black mb-4">Upcoming Events</h2>
              <p className="text-slate-400 text-lg max-w-2xl">
                Find your next challenge. Register directly through the Dashly app.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-3 gap-8 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-96 bg-white/5 rounded-3xl border border-white/5"></div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center p-12 bg-white/5 border border-white/10 rounded-3xl">
              <p className="text-slate-400">
                No public events available right now. Check back later!
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              {events.map((event) => (
                <Link
                  href={`/events/${event.id}`}
                  key={event.id}
                  className="group block rounded-3xl bg-slate-950 border border-white/10 overflow-hidden hover:border-indigo-500/50 transition-all hover:shadow-[0_0_30px_rgba(79,70,229,0.15)] hover:-translate-y-1"
                >
                  <div className="relative h-48 w-full">
                    {event.banner ? (
                      <img
                        src={event.banner}
                        alt={event.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                        <MapPin className="w-12 h-12 text-slate-600" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-xs font-bold border border-white/10">
                      {event.registrationStatus?.replace(/_/g, " ") || "UNKNOWN"}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2 group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {event.name}
                    </h3>
                    <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                      {event.description || "No description provided."}
                    </p>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Calendar className="w-4 h-4 text-indigo-400" />
                        <span>
                          {event.dateEvent ? new Date(event.dateEvent).toLocaleDateString() : "TBA"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <MapPin className="w-4 h-4 text-emerald-400" />
                        <span className="line-clamp-1">{event.locationName || "TBA"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Users className="w-4 h-4 text-cyan-400" />
                        <span>
                          {event.currentCount} / {event.maxParticipants} Registered
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm font-bold text-indigo-400 group-hover:text-indigo-300">
                      View Details
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Download & CTA ── */}
      <section id="download" className="py-24 relative z-10 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-900 to-slate-900 border border-white/10 p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/20 rounded-full mix-blend-screen filter blur-[80px]"></div>

            <div className="relative z-10 text-center md:text-left flex-1">
              <h2 className="text-3xl md:text-4xl font-black mb-4">Ready to hit the trail?</h2>
              <p className="text-indigo-200 text-lg mb-8 max-w-md">
                Download the Dashly participant app to register for events, access your QR ticket,
                and enable live tracking during the race.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="px-8 py-4 bg-white text-slate-900 hover:bg-slate-100 rounded-full font-bold text-lg transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.5)] flex items-center justify-center gap-2">
                  <Smartphone className="w-5 h-5" /> Download for Android
                </button>
              </div>
            </div>

            <div className="relative z-10 hidden md:block w-48 aspect-[9/19] bg-slate-950 border-[6px] border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden flex-shrink-0">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80')] bg-cover bg-center"></div>
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950 to-transparent"></div>
              <div className="absolute bottom-6 left-0 right-0 text-center px-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl mx-auto flex items-center justify-center mb-3">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div className="font-bold text-sm">Dashly Tracking</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer / Contact ── */}
      <footer id="contact" className="py-12 border-t border-white/5 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              <span className="font-bold tracking-tight">Dashly Engine</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <a href="#" className="hover:text-white transition-colors flex items-center gap-2">
                <Mail className="w-4 h-4" /> support@dashly.app
              </a>
              <a href="#" className="hover:text-white transition-colors flex items-center gap-2">
                <Globe className="w-4 h-4" /> dashboard
              </a>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-slate-600">
            &copy; {new Date().getFullYear()} Dashly Platform. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

// CheckCircle icon component since lucide-react might not export it or it's named differently
function CheckCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
