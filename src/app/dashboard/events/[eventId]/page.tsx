"use client";

import React, { use, useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowLeft, Edit3, Settings, ShieldAlert, Calendar, MapPin, Users, Key, Save, X, Play, Square, PauseCircle, Trash2, UserCircle, Download, Copy, Check, QrCode, Phone, Mail, HeartPulse, Info as InfoIcon, Clock, Timer, Bike, Footprints, Image as ImageIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import StaticMapWrapper from "@/components/map/index-static";
import MapWrapper from "@/components/map/DynamicLiveMap";
import RouteEditorMapWrapper from "@/components/map/index-editor";
import MapBuilderWrapper from "@/components/map/index-builder";
import LocationPickerMapWrapper from "@/components/map/index-picker";
import LocationSearch from "@/components/map/LocationSearch";
import { convertFileToGeoJSON, extractMainRoute } from "@/lib/utils/route-converter";

export default function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  const [event, setEvent] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [editForm, setEditForm] = useState({ 
    name: "", description: "", maxParticipants: 0, dateEvent: "",
    startTime: "", endTime: "", monitoringStartOffset: 60, monitoringEndOffset: 240,
    registrationOpen: "", registrationClose: "", locationName: "", city: "", province: "",
    latitude: "" as number | "", longitude: "" as number | "", bannerImage: ""
  });
  const [tempGeoJson, setTempGeoJson] = useState<any>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Participant Modal State
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);


  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift();
    return null;
  };

  const fetchEventData = async () => {
    try {
      const token = getCookie("auth_token");
      const [eventRes, participantsRes] = await Promise.all([
        fetch(`${apiUrl}/events/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/events/${eventId}/participants`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (!eventRes.ok) throw new Error("Failed to fetch event details");
      const eventResponse = await eventRes.json();
      const participantsResponse = participantsRes.ok ? await participantsRes.json() : { data: [] };
      
      // Handle standardized response format
      const eventData = eventResponse.success ? eventResponse.data : eventResponse;
      const participantsData = participantsResponse.success ? participantsResponse.data : (Array.isArray(participantsResponse) ? participantsResponse : []);
      
      setEvent(eventData);
      setParticipants(participantsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
    const interval = setInterval(fetchEventData, 3000);
    return () => clearInterval(interval);
  }, [eventId]);

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm({ ...editForm, bannerImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditInit = () => {
    if (!event) return;
    
    const formatLocalDatetime = (dateStr: string | null) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setEditForm({
      name: event.name,
      description: event.description || "",
      maxParticipants: event.maxParticipants,
      dateEvent: event.dateEvent ? new Date(event.dateEvent).toISOString().split("T")[0] : "",
      startTime: formatLocalDatetime(event.startTime),
      endTime: formatLocalDatetime(event.endTime),
      monitoringStartOffset: event.monitoringStartOffset ?? 60,
      monitoringEndOffset: event.monitoringEndOffset ?? 240,
      registrationOpen: formatLocalDatetime(event.registrationOpen),
      registrationClose: formatLocalDatetime(event.registrationClose),
      locationName: event.locationName || "",
      city: event.city || "",
      province: event.province || "",
      latitude: event.latitude ?? "",
      longitude: event.longitude ?? "",
      bannerImage: event.bannerImage || "",
    });
    setIsEditing(true);
  };

  const handleSaveDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const token = getCookie("auth_token");
      
      const payloadToSave = isEditingRoute ? { routeGeojson: tempGeoJson } : {
        ...editForm,
        startTime: editForm.startTime ? new Date(editForm.startTime).toISOString() : undefined,
        endTime: editForm.endTime ? new Date(editForm.endTime).toISOString() : undefined,
        registrationOpen: editForm.registrationOpen ? new Date(editForm.registrationOpen).toISOString() : undefined,
        registrationClose: editForm.registrationClose ? new Date(editForm.registrationClose).toISOString() : undefined,
        latitude: editForm.latitude === "" ? undefined : Number(editForm.latitude),
        longitude: editForm.longitude === "" ? undefined : Number(editForm.longitude),
      };

      const res = await fetch(`${apiUrl}/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payloadToSave),
      });
      if (!res.ok) throw new Error("Failed to update event");
      const response = await res.json();
      const updated = response.success ? response.data : response;
      setEvent(updated);
      setIsEditing(false);
      setIsEditingRoute(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    setIsDeleting(true);
    try {
      const token = getCookie("auth_token");
      const res = await fetch(`${apiUrl}/events/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete event");
      router.push("/dashboard/events");
    } catch (err: any) {
      setError(err.message);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!participants || participants.length === 0) return;
    const header = ["Participant ID", "Name", "Email", "Phone", "Registration Date"];
    const rows = participants.map((p: any) => [
      p.id,
      p.user?.name || p.name || "Unknown",
      p.user?.email || p.email || "Unknown",
      p.user?.phone || p.phone || "Unknown",
      new Date(p.joinedAt).toLocaleString()
    ]);
    const csvContent = [header, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `participants_${eventId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (isStatusUpdating) return;
    setIsStatusUpdating(true);
    setError("");
    try {
      const token = getCookie("auth_token");
      const res = await fetch(`${apiUrl}/events/${eventId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to change event status");
      }
      const response = await res.json();
      const updated = response.success ? response.data : response;
      setEvent(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleOpenParticipant = (p: any) => {
    setSelectedParticipant(p);
    setIsParticipantModalOpen(true);
  };

  const handleUpdateParticipantState = async (participantId: number, newState: string) => {
    try {
      const token = getCookie("auth_token");
      const res = await fetch(`${apiUrl}/events/${eventId}/participants/${participantId}/state`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ state: newState }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to update participant state");
      }
      // Refresh participant list
      await fetchEventData();
      // Update selected participant if modal is open
      if (selectedParticipant && selectedParticipant.id === participantId) {
        setSelectedParticipant({ ...selectedParticipant, participantState: newState });
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Helper to format monitoring window times
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "Not Set";
    return new Date(dateStr).toLocaleString(undefined, { 
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" 
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 dark:bg-[#0f172a] font-sans h-full">
      <div className="max-w-5xl mx-auto space-y-6 pb-12">

        {/* Top Bar */}
        <div className="flex items-center justify-between mb-2">
          <Link href="/dashboard/events" className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            <ArrowLeft size={16} /> Back to Directory
          </Link>
          {!loading && event && (
            <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all">
              <Trash2 size={14} /> Delete Event
            </button>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Are you sure?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">This will soft-delete the event. It will no longer appear on the dashboard, but historical data is preserved.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 transition-all">Cancel</button>
                <button onClick={handleDeleteEvent} disabled={isDeleting} className="flex-1 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-all disabled:opacity-50">
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center p-12 text-slate-500 animate-pulse font-bold tracking-widest uppercase">
            Loading Event Architecture...
          </div>
        )}

        {error && (
          <div className="p-6 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-2xl font-bold flex items-center gap-3">
            <ShieldAlert className="w-6 h-6" />
            {error}
          </div>
        )}

        {!loading && !error && event && (
          <>
            {/* Header Ribbon */}
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 dark:bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative z-10 w-full">
                <div className="flex justify-between items-start w-full">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      {/* Category Badge */}
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                        event.category === "CYCLING"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
                      }`}>
                        {event.category === "CYCLING" ? <Bike size={12} /> : <Footprints size={12} />}
                        {event.category || "RUNNING"}
                      </span>
                      {/* Status Badge */}
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                        event.status === "START"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
                          : event.status === "IDLE"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400 border border-slate-200 dark:border-slate-500/30"
                      }`}>
                        {event.status === "START" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                        {event.status}
                      </span>
                      <span className="text-sm font-mono text-slate-500 tracking-tight">ID: {event.id}</span>
                    </div>
                    {isEditing ? (
                      <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight bg-transparent border-b-2 border-indigo-500 focus:outline-none w-full max-w-lg" />
                    ) : (
                      <h1 className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">{event.name}</h1>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 items-end">
                    <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner overflow-x-auto max-w-full">
                      {["DRAFT", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "READY", "LIVE", "FINISHED", "CANCELLED"].map((status) => (
                        <button 
                          key={status}
                          disabled={isStatusUpdating || event.status === status} 
                          onClick={() => handleStatusChange(status)} 
                          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${event.status === status ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                        >
                          {status.replace(/_/g, " ")}
                        </button>
                      ))}
                    </div>
                    {(event.status === "READY" || event.status === "LIVE" || event.status === "START") && (
                      <Link href={`/dashboard/monitoring/${eventId}`} className="flex items-center justify-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white rounded-xl font-bold transition-all shadow-md hover:-translate-y-0.5 mt-2">
                        <Activity className="w-4 h-4" /> Live Monitor
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Grid */}
            <form onSubmit={handleSaveDetails} className="grid grid-cols-1 md:grid-cols-5 gap-6">

              {/* Left Column */}
              <div className="md:col-span-3 space-y-6">

                {/* General Details Card */}
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group transition-colors">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3 text-slate-800 dark:text-slate-100">
                      <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20"><Settings size={20} /></div>
                      <h3 className="font-bold text-lg tracking-tight">General Details</h3>
                    </div>
                    {isEditing ? (
                      <div className="flex gap-2 relative z-10">
                        <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"><X size={14} /> Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-400 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all">{isSaving ? "Saving..." : <><Save size={14} /> Save</>}</button>
                      </div>
                    ) : (
                      <button type="button" onClick={handleEditInit} className="p-2 ml-auto bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg transition-all relative z-10"><Edit3 size={16} /></button>
                    )}
                  </div>
                  <div className="space-y-6">
                    <div>
                      <div className="text-[11px] text-slate-500 uppercase font-black tracking-widest mb-1.5 opacity-70">Event Description</div>
                      {isEditing ? (
                        <textarea rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none z-10 relative" />
                      ) : (
                        <div className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed font-medium">
                          {event.description || <span className="italic text-slate-400">No description provided.</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex-[0.5]">
                        <div className="text-[11px] text-slate-500 uppercase font-black tracking-widest mb-1.5 opacity-70 flex items-center gap-1.5"><Calendar size={13} /> Scheduled Date</div>
                        {isEditing ? (
                          <input type="date" value={editForm.dateEvent} onChange={(e) => setEditForm({ ...editForm, dateEvent: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:outline-none relative z-10" />
                        ) : (
                          <div className="text-slate-800 dark:text-slate-100 font-bold">
                            {new Date(event.dateEvent).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "long", day: "numeric" })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Location & Registration & Banner Info */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] text-slate-500 uppercase font-black tracking-widest mb-3 opacity-70 flex items-center gap-1.5"><MapPin size={13} /> Location & Registration</div>
                      
                      {isEditing ? (
                        <div className="space-y-4">
                          <LocationSearch 
                            onLocationSelect={(result) => {
                              setEditForm({
                                ...editForm,
                                locationName: result.name,
                                city: result.city || editForm.city,
                                province: result.province || editForm.province,
                                latitude: result.latitude,
                                longitude: result.longitude
                              });
                            }}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Registration Open</label>
                              <input type="datetime-local" value={editForm.registrationOpen} onChange={(e) => setEditForm({ ...editForm, registrationOpen: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:outline-none relative z-10" />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Registration Close</label>
                              <input type="datetime-local" value={editForm.registrationClose} onChange={(e) => setEditForm({ ...editForm, registrationClose: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:outline-none relative z-10" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Location Name</label>
                            <input type="text" value={editForm.locationName} onChange={(e) => setEditForm({ ...editForm, locationName: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:outline-none relative z-10" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">City</label>
                              <input type="text" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:outline-none relative z-10" />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Province</label>
                              <input type="text" value={editForm.province} onChange={(e) => setEditForm({ ...editForm, province: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:outline-none relative z-10" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Latitude</label>
                              <input type="number" step="any" value={editForm.latitude} onChange={(e) => setEditForm({ ...editForm, latitude: e.target.value === "" ? "" : Number(e.target.value) })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:outline-none relative z-10" />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Longitude</label>
                              <input type="number" step="any" value={editForm.longitude} onChange={(e) => setEditForm({ ...editForm, longitude: e.target.value === "" ? "" : Number(e.target.value) })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:outline-none relative z-10" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Pick Location on Map</label>
                            <div className="h-[250px] w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 relative z-0">
                              <LocationPickerMapWrapper 
                                latitude={editForm.latitude} 
                                longitude={editForm.longitude} 
                                onChange={(lat: number, lng: number) => setEditForm({ ...editForm, latitude: lat, longitude: lng })} 
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2 pl-1">
                              Banner Image
                            </label>
                            {editForm.bannerImage ? (
                              <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 group z-10">
                                <img src={editForm.bannerImage} alt="Banner" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button type="button" onClick={() => setEditForm({ ...editForm, bannerImage: "" })} className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-bold flex items-center gap-2">
                                    <Trash2 size={16} /> Remove
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group z-10 relative">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <ImageIcon className="w-8 h-8 mb-2 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                  <p className="mb-2 text-sm text-slate-500 dark:text-slate-400"><span className="font-bold">Click to upload</span> or drag and drop</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">PNG, JPG, or WEBP</p>
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} />
                              </label>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 text-sm font-medium pb-2">
                          <div><span className="text-slate-400">Reg Open:</span> {event.registrationOpen ? new Date(event.registrationOpen).toLocaleDateString() : '-'}</div>
                          <div><span className="text-slate-400">Reg Close:</span> {event.registrationClose ? new Date(event.registrationClose).toLocaleDateString() : '-'}</div>
                          <div><span className="text-slate-400">Location:</span> {event.locationName || '-'}</div>
                          <div><span className="text-slate-400">City/Prov:</span> {event.city || '-'}, {event.province || '-'}</div>
                          <div className="col-span-2 text-xs truncate"><span className="text-slate-400">Banner:</span> {event.bannerImage || "None"}</div>
                        </div>
                      )}
                    </div>

                    {/* Monitoring Window Info */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] text-slate-500 uppercase font-black tracking-widest mb-3 opacity-70 flex items-center gap-1.5"><Timer size={13} /> Monitoring Window</div>
                      
                      {isEditing ? (
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div>
                            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Race Start</label>
                            <input type="datetime-local" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:outline-none relative z-10" />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Race End</label>
                            <input type="datetime-local" value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:outline-none relative z-10" />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Pre-Start Offset (min)</label>
                            <input type="number" value={editForm.monitoringStartOffset} onChange={(e) => setEditForm({ ...editForm, monitoringStartOffset: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:outline-none relative z-10" />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Post-End Offset (min)</label>
                            <input type="number" value={editForm.monitoringEndOffset} onChange={(e) => setEditForm({ ...editForm, monitoringEndOffset: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:outline-none relative z-10" />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800/60">
                              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Race Start</div>
                              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatDateTime(event.startTime)}</div>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800/60">
                              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Race End</div>
                              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatDateTime(event.endTime)}</div>
                            </div>
                            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-xl border border-indigo-100 dark:border-indigo-500/10">
                              <div className="text-[10px] text-indigo-500 uppercase font-bold tracking-wider mb-1">Window Opens</div>
                              <div className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                                {event.monitoringWindow ? formatDateTime(event.monitoringWindow.actualStart) : "N/A"}
                              </div>
                            </div>
                            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-xl border border-indigo-100 dark:border-indigo-500/10">
                              <div className="text-[10px] text-indigo-500 uppercase font-bold tracking-wider mb-1">Window Closes</div>
                              <div className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                                {event.monitoringWindow ? formatDateTime(event.monitoringWindow.actualEnd) : "N/A"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <span>Pre-Start: {event.monitoringStartOffset ?? 60}min</span>
                            <span>•</span>
                            <span>Post-End: {event.monitoringEndOffset ?? 240}min</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Route Section with Edit Toggle */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-[11px] text-slate-500 uppercase font-black tracking-widest opacity-70 flex items-center gap-1.5"><MapPin size={13} /> Route Configuration</div>
                        {isEditingRoute ? (
                          <div className="flex gap-2 relative z-20">
                            <button type="button" onClick={() => setIsEditingRoute(false)} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded text-[10px] font-bold">Cancel</button>
                            <button type="button" onClick={() => handleSaveDetails()} disabled={isSaving} className="px-2 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold">{isSaving ? "Saving..." : "Save Route"}</button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setIsEditingRoute(true)} className="px-2 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 rounded text-[10px] font-bold flex items-center gap-1 transition-all">
                            <Edit3 size={10} /> Edit Route
                          </button>
                        )}
                      </div>
                      <div className="h-80 w-full rounded-xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-800 z-10 relative">
                        {isEditingRoute ? (
                          <RouteEditorMapWrapper initialGeoJSON={event.routeGeojson} onGeoJsonChange={setTempGeoJson} />
                        ) : (
                          <StaticMapWrapper geoJson={event.routeGeojson} />
                        )}
                      </div>
                      {isEditingRoute && (
                        <p className="text-[10px] text-slate-400 mt-2 font-medium italic">* Draw new segments or delete existing ones using the toolbar on the left.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Participants Section */}
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3 text-slate-800 dark:text-slate-100">
                      <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20"><Users size={20} /></div>
                      <h3 className="font-bold text-lg tracking-tight">Detail Participant</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={handleDownloadCSV} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition-all">
                        <Download size={14} /> Export CSV
                      </button>
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-xs font-bold font-mono">
                        {participants.length} TOTAL
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-4 py-3 rounded-tl-xl">Participant</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3">State</th>
                          <th className="px-4 py-3">Joined Date</th>
                          <th className="px-4 py-3 rounded-tr-xl text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {participants.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400">
                              <UserCircle size={40} className="opacity-10 mb-2 mx-auto" />
                              <p className="text-sm font-medium">No participants have joined yet.</p>
                            </td>
                          </tr>
                        ) : (
                          participants.map((p) => (
                            <tr key={p.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${p.participantState === 'FROZEN' ? 'bg-rose-50/50 dark:bg-rose-500/5' : ''}`}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${p.participantState === 'FROZEN' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-indigo-100 dark:bg-slate-800 text-indigo-600 dark:text-cyan-400'}`}>
                                    <UserCircle size={16} />
                                  </div>
                                  <span className="font-bold text-slate-800 dark:text-slate-100">{p.name || p.user?.name || "Unknown"}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{p.email || p.user?.email || "Unknown"}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                  p.participantState === 'FROZEN' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30' :
                                  p.participantState === 'TRACKING' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30' :
                                  p.participantState === 'CONFIRMED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30' :
                                  p.participantState === 'FINISHED' ? 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400 border border-slate-200 dark:border-slate-500/30' :
                                  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                                }`}>
                                  {p.participantState === 'FROZEN' && '❄️ '}{p.participantState || 'REGISTERED'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">{new Date(p.joinedAt).toLocaleDateString()}</td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center gap-2 justify-end">
                                  <button 
                                    type="button"
                                    onClick={() => handleOpenParticipant(p)}
                                    className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-md text-xs font-bold transition-all"
                                  >
                                    Detail
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="md:col-span-2 space-y-6">

                {/* Capacity Control Card */}
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden h-fit">
                  <div className="flex items-center gap-3 mb-6 text-slate-800 dark:text-slate-100">
                    <div className="p-2.5 bg-cyan-50 dark:bg-cyan-500/10 rounded-xl text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-500/20"><ShieldAlert size={20} /></div>
                    <h3 className="font-bold text-lg tracking-tight">Capacity Control</h3>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <div className="text-[11px] text-slate-500 uppercase font-black tracking-widest mb-1.5 opacity-70 flex items-center gap-1.5"><Users size={13} /> Participant Load</div>
                      {isEditing ? (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm font-bold text-slate-500 w-24">Max:</span>
                          <input type="number" value={editForm.maxParticipants} onChange={(e) => setEditForm({ ...editForm, maxParticipants: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:outline-none relative z-10" />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-end gap-2">
                            <span className="text-3xl font-black text-slate-800 dark:text-slate-100 leading-none">{event.currentCount}</span>
                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">/ {event.maxParticipants} Slots</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (event.currentCount / event.maxParticipants) * 100)}%` }}></div>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                      <button type="button" onClick={() => fetchEventData()} className="text-xs font-bold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
                        ↻ Refresh Data
                      </button>
                    </div>
                  </div>
                </div>

                {/* Access Key Card */}
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden h-fit flex flex-col items-center">
                  <div className="flex items-center gap-3 mb-6 w-full text-slate-800 dark:text-slate-100">
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20"><Key size={20} /></div>
                    <h3 className="font-bold text-lg tracking-tight">Access Key</h3>
                  </div>
                  <div className="w-full space-y-4">
                    <div className="flex justify-center">
                      <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        {event.token ? (
                          <QRCodeSVG value={event.token} size={140} level="M" />
                        ) : (
                          <div className="w-[140px] h-[140px] bg-slate-100 flex items-center justify-center text-slate-400">
                            <QrCode size={40} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div 
                      className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800/60 text-center relative group cursor-pointer" 
                      onClick={() => { 
                        navigator.clipboard.writeText(event.token || ""); 
                        alert("Token copied to clipboard!"); 
                      }}
                    >
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2">Event Token (Click to Copy)</div>
                      <div className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-[0.2em]">{event.token || "------"}</div>
                      <div className="absolute inset-0 bg-indigo-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                        <Copy className="text-indigo-600 w-8 h-8" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 text-center font-medium leading-relaxed">
                      Participants can enter this 6-character code or scan the QR Code on their mobile app to join this event directly.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </>
        )}

        {/* Participant Details Modal */}
        {isParticipantModalOpen && selectedParticipant && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div 
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300"
              onClick={() => setIsParticipantModalOpen(false)}
            ></div>
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 fade-in duration-300">
              
              <div className="absolute top-0 right-0 w-full h-32 bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 dark:from-indigo-500/20 dark:to-cyan-500/20 -z-10"></div>
              
              <div className="p-6 sm:p-8">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                      <UserCircle size={40} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{selectedParticipant.user?.name || selectedParticipant.name || "Unknown"}</h2>
                      <p className="text-sm font-bold text-indigo-600 dark:text-cyan-400 uppercase tracking-widest">Participant Profile</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsParticipantModalOpen(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-slate-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                      <div className="flex items-center gap-2 mb-2 text-slate-400">
                        <Mail size={14} />
                        <span className="text-[10px] uppercase font-black tracking-widest">Email Address</span>
                      </div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedParticipant.user?.email || selectedParticipant.email || "Not Provided"}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                      <div className="flex items-center gap-2 mb-2 text-slate-400">
                        <Phone size={14} />
                        <span className="text-[10px] uppercase font-black tracking-widest">Contact Number</span>
                      </div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {selectedParticipant.user?.phone || selectedParticipant.phone || <span className="text-slate-400 font-medium italic">Not Provided</span>}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                    <div className="flex items-center gap-2 mb-2 text-indigo-400">
                      <span className="text-[10px] uppercase font-black tracking-widest text-indigo-500">BIB Number</span>
                    </div>
                    <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300 tracking-widest">
                      {selectedParticipant.bibNumber || <span className="text-sm font-medium italic opacity-70">Not Assigned</span>}
                    </p>
                  </div>

                  <div className="p-6 bg-rose-50/50 dark:bg-rose-500/5 rounded-2xl border border-rose-100 dark:border-rose-500/20">
                    <div className="flex items-center gap-3 mb-4 text-rose-600 dark:text-rose-400">
                      <HeartPulse size={18} />
                      <h3 className="font-bold text-sm uppercase tracking-wider">Safety & Health Info</h3>
                    </div>
                    
                    {selectedParticipant.healthInfo || selectedParticipant.user?.healthInfo ? (
                      <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                        {Object.entries(selectedParticipant.healthInfo || selectedParticipant.user?.healthInfo).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter block mb-0.5">{key.replace(/([A-Z])/g, ' $1')}</span>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400">
                        <InfoIcon size={14} />
                        <span className="text-xs font-medium italic">No emergency health data reported for this user.</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 font-mono">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Registration Date</span>
                    <span className="text-xs font-bold text-slate-500">{new Date(selectedParticipant.joinedAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-8">
                  <button 
                    onClick={() => setIsParticipantModalOpen(false)}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl font-bold transition-all shadow-lg"
                  >
                    Dismiss Information
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
