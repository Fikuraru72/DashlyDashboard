import React from "react";
import Link from "next/link";
import { Activity, MapPin, Calendar, Users, ArrowLeft, Download, ShieldCheck } from "lucide-react";
import PublicRegistrationForm from "@/components/events/PublicRegistrationForm";
import MapWrapper from "@/components/map/DynamicLiveMap";
import type { Metadata } from 'next';

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  // We can fetch data here for SEO, but to avoid double fetching for now, we'll set it in a client component or just set static here. 
  // Actually, Server Components in Next.js App Router allow us to fetch data here easily.
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  try {
    const res = await fetch(`${apiUrl}/public-events/${params.id}`);
    const data = await res.json();
    const event = data.success ? data.data : data;
    if (event?.name) {
      return {
        title: `${event.name} | Dashly Events`,
        description: event.description || "Join this exciting Dashly event.",
      }
    }
  } catch (e) { }

  return {
    title: 'Event Details | Dashly',
    description: 'View details for this Dashly event.',
  }
}

export default async function EventDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  let event = null;
  try {
    const res = await fetch(`${apiUrl}/public-events/${params.id}`, { cache: 'no-store' });
    const data = await res.json();
    event = data.success ? data.data : data;
  } catch (err) {
    console.error(err);
  }

  if (!event || event.message === 'Event not found' || event.statusCode === 404) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white flex-col gap-4">
        <h1 className="text-3xl font-bold">Event Not Found</h1>
        <Link href="/" className="text-indigo-400 hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-indigo-500/30">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <Activity className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Dashly</span>
          </Link>
          <Link href="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Events
          </Link>
        </div>
      </nav>

      {/* ── Event Hero ── */}
      <section className="pt-20">
        <div className="relative w-full h-[40vh] md:h-[60vh] bg-slate-900 border-b border-white/10">
          {event.banner ? (
            <img src={event.banner} alt={event.name} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center">
              <Activity className="w-24 h-24 text-white/10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent"></div>

          <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-6 pb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-wider mb-4">
              {event.registrationStatus?.replace(/_/g, ' ') || 'UNKNOWN'}
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">{event.name}</h1>
            <div className="flex flex-wrap items-center gap-6 text-slate-300">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <span className="font-medium text-lg">{event.dateEvent ? new Date(event.dateEvent).toLocaleDateString() : 'TBA'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-400" />
                <span className="font-medium text-lg">{event.locationName || 'Location TBA'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Event Details & Registration ── */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-3 gap-12">

          {/* Main Info */}
          <div className="lg:col-span-2 space-y-12">
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Activity className="w-6 h-6 text-indigo-400" /> About the Event
              </h2>
              <div className="prose prose-invert max-w-none text-slate-300 text-lg leading-relaxed">
                {event.description ? (
                  <p>{event.description}</p>
                ) : (
                  <p>No description provided for this event.</p>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-white">Location Details</h3>
                </div>
                <p className="text-slate-400">{event.locationName || 'TBA'}</p>
                {event.city && <p className="text-slate-400">{event.city}, {event.province}</p>}
              </div>
              <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-bold text-white">Safety First</h3>
                </div>
                <p className="text-slate-400">This event is monitored with Dashly's real-time engine, ensuring maximum participant safety.</p>
              </div>
            </div>

            {/* Route Map */}
            {event.routeGeojson && (
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-emerald-400" /> Route Map
                </h2>
                <div className="h-80 md:h-96 w-full rounded-3xl overflow-hidden border border-white/10 shadow-lg relative z-0">
                  <StaticMapWrapper geoJson={event.routeGeojson} />
                </div>
              </div>
            )}
          </div>

          {/* Registration Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 rounded-3xl bg-gradient-to-br from-indigo-900/50 to-slate-900/50 border border-indigo-500/30 p-8 shadow-2xl backdrop-blur-xl">
              <h3 className="text-xl font-bold mb-6 text-white">Registration Status</h3>

              <div className="space-y-6 mb-8">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300">Capacity Filled</span>
                    <span className="font-bold text-white">{event.currentCount} / {event.maxParticipants}</span>
                  </div>
                  <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                      style={{ width: `${Math.min(100, (event.currentCount / event.maxParticipants) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10">
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-slate-300">Registration Opens</span>
                    <span className="font-bold text-emerald-400">{event.registrationOpen ? new Date(event.registrationOpen).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-slate-300">Registration Closes</span>
                    <span className="font-bold text-rose-400">{event.registrationClose ? new Date(event.registrationClose).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-slate-300">Event Starts</span>
                    <span className="font-bold text-indigo-400">{event.startTime ? new Date(event.startTime).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Event Ends</span>
                    <span className="font-bold text-slate-300">{event.endTime ? new Date(event.endTime).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              </div>

              <PublicRegistrationForm 
                eventId={event.id} 
                eventStatus={event.registrationStatus || event.status} 
                eventName={event.name}
                eventDate={event.dateEvent}
                eventLocation={event.locationName}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 border-t border-white/5 bg-slate-950 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-slate-600">
          &copy; {new Date().getFullYear()} Dashly Platform. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
