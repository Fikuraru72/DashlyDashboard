"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Route,
  Trash2,
  MapPin,
  Users,
  Info,
  Sparkles,
  CheckCircle,
  Calendar,
  Upload,
  MousePointer2,
  FileCode,
  Timer,
  Clock,
  Bike,
  Footprints,
  Image as ImageIcon,
} from "lucide-react";
import { apiFetch, authenticatedFetch } from "@/lib/api";
import MapBuilderWrapper from "@/components/map/index-builder";
import LocationPickerMapWrapper from "@/components/map/index-picker";

export default function CreateEventPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dateEvent, setDateEvent] = useState("");
  const [maxParticipants, setMaxParticipants] = useState<number | "">("");
  const [category, setCategory] = useState<"RUNNING" | "CYCLING">("RUNNING");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [monitoringStartOffset, setMonitoringStartOffset] = useState(60);
  const [monitoringEndOffset, setMonitoringEndOffset] = useState(240);
  const [registrationOpen, setRegistrationOpen] = useState("");
  const [registrationClose, setRegistrationClose] = useState("");
  const [locationName, setLocationName] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [latitude, setLatitude] = useState<number | "">("");
  const [longitude, setLongitude] = useState<number | "">("");
  const [bannerImage, setBannerImage] = useState("");
  const [geoJson, setGeoJson] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"manual" | "upload">("manual");
  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [totalDistance, setTotalDistance] = useState<number | undefined>();
  const [totalElevation, setTotalElevation] = useState<number | undefined>();

  const [clearTrigger, setClearTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleClearMap = () => {
    setGeoJson(null);
    setClearTrigger((prev) => prev + 1);
    setUploadError("");
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadError("");
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension !== "gpx" && extension !== "kml") {
      setUploadError("Please upload a .gpx or .kml file.");
      return;
    }

    try {
      const token = getCookie("auth_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const formData = new FormData();
      formData.append("file", file);

      const res = await authenticatedFetch(`${apiUrl}/events/upload-gpx`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to parse GPX file");
      }

      const { data } = await res.json();

      // Keep distance and elevation state
      // (Need to add these to component state to submit later)
      setTotalDistance(data.totalDistanceMeters);
      setTotalElevation(data.totalElevationMeters);

      setGeoJson({
        type: "FeatureCollection",
        features: [data.geoJson],
      });
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload file");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFileUpload(file);
  };

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift();
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!geoJson || !geoJson.features || geoJson.features.length === 0) {
      setError("Please draw a valid route on the map.");
      setIsLoading(false);
      return;
    }

    if (!startTime || !endTime) {
      setError("Start Time and End Time are required for race monitoring.");
      setIsLoading(false);
      return;
    }

    try {
      const token = getCookie("auth_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

      const payload = {
        name,
        description,
        category,
        maxParticipants: Number(maxParticipants),
        dateEvent,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        registrationOpen: registrationOpen ? new Date(registrationOpen).toISOString() : undefined,
        registrationClose: registrationClose
          ? new Date(registrationClose).toISOString()
          : undefined,
        locationName,
        city,
        province,
        latitude: latitude === "" ? undefined : Number(latitude),
        longitude: longitude === "" ? undefined : Number(longitude),
        bannerImage,
        monitoringStartOffset,
        monitoringEndOffset,
        totalDistanceMeters: totalDistance,
        totalElevationMeters: totalElevation,
        routeGeojson: geoJson,
      };

      await apiFetch(`${apiUrl}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard/events");
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shadow-sm z-10 transition-colors">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-cyan-400">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-500 dark:from-cyan-400 dark:to-emerald-400">
              Event Command
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Create New Race
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden p-6 gap-6 relative">
        {/* Success Toast / Notification */}
        {success && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-10 duration-500">
            <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 font-bold border border-emerald-400">
              <CheckCircle className="w-6 h-6" />
              Event created successfully! Redirecting...
            </div>
          </div>
        )}

        {/* Left Column: Form */}
        <aside className="w-full lg:w-[450px] flex-shrink-0 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-y-auto">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-6 h-6 text-indigo-500" />
              Event Details
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Configure competition parameters and race details.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 flex-1 flex flex-col gap-5">
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-bold rounded-xl flex items-start gap-2">
                <Info className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* General Information */}
            <div className="pt-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">
                General Information
              </h3>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 pl-1">
                  Event Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={255}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:ring-cyan-500/20 dark:focus:border-cyan-500 transition-all outline-none"
                    placeholder="e.g. Ultra Trail Championship 2026"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 pl-1">
                  Description
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:ring-cyan-500/20 dark:focus:border-cyan-500 transition-all outline-none resize-none"
                  placeholder="Event background and details..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 pl-1">
                  Banner Image
                </label>
                {bannerImage ? (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 group">
                    <img src={bannerImage} alt="Banner" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => setBannerImage("")}
                        className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                      >
                        <Trash2 size={16} /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ImageIcon className="w-8 h-8 mb-2 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                      <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                        <span className="font-bold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        PNG, JPG, or WEBP (Max. 5MB)
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleBannerUpload}
                    />
                  </label>
                )}
              </div>

              {/* Category Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 pl-1">
                  Race Category
                </label>
                <div className="flex p-1 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCategory("RUNNING")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${
                      category === "RUNNING"
                        ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    <Footprints size={16} />
                    Running
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory("CYCLING")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${
                      category === "CYCLING"
                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    <Bike size={16} />
                    Cycling
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 pl-1">
                    Event Date
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <input
                      type="date"
                      required
                      value={dateEvent}
                      onChange={(e) => setDateEvent(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:ring-cyan-500/20 dark:focus:border-cyan-500 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Registration Section */}
              <div className="pt-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">
                  Registration
                </h3>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 pl-1">
                    Max Participants
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Users className="h-5 w-5" />
                    </div>
                    <input
                      type="number"
                      min="1"
                      required
                      value={maxParticipants}
                      onChange={(e) =>
                        setMaxParticipants(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      className="block w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:ring-cyan-500/20 dark:focus:border-cyan-500 transition-all outline-none"
                      placeholder="1000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 pl-1">
                      Registration Open
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <input
                        type="datetime-local"
                        value={registrationOpen}
                        onChange={(e) => setRegistrationOpen(e.target.value)}
                        className="block w-full pl-10 pr-2 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:ring-cyan-500/20 dark:focus:border-cyan-500 transition-all outline-none text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 pl-1">
                      Registration Close
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <input
                        type="datetime-local"
                        value={registrationClose}
                        onChange={(e) => setRegistrationClose(e.target.value)}
                        className="block w-full pl-10 pr-2 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:ring-cyan-500/20 dark:focus:border-cyan-500 transition-all outline-none text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Section */}
              <div className="pt-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">
                  Location
                </h3>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 pl-1">
                    Location Name (e.g. Venue)
                  </label>
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:ring-cyan-500/20 dark:focus:border-cyan-500 transition-all outline-none"
                    placeholder="Gelora Bung Karno"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 pl-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium transition-all outline-none"
                      placeholder="Jakarta"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 pl-1">
                      Province
                    </label>
                    <input
                      type="text"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium transition-all outline-none"
                      placeholder="DKI Jakarta"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 pl-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) =>
                        setLatitude(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium transition-all outline-none"
                      placeholder="-6.2146"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 pl-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) =>
                        setLongitude(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium transition-all outline-none"
                      placeholder="106.8451"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 pl-1">
                    Pick Location on Map
                  </label>
                  <div className="h-[250px] w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                    <LocationPickerMapWrapper
                      latitude={latitude}
                      longitude={longitude}
                      onChange={(lat: number, lng: number) => {
                        setLatitude(lat);
                        setLongitude(lng);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Monitoring Section */}
              <div className="pt-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">
                  Monitoring
                </h3>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 pl-1">
                    Start Time *
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Clock className="h-4 w-4" />
                    </div>
                    <input
                      type="datetime-local"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="block w-full pl-10 pr-2 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:ring-cyan-500/20 dark:focus:border-cyan-500 transition-all outline-none text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 pl-1">
                    End Time *
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Clock className="h-4 w-4" />
                    </div>
                    <input
                      type="datetime-local"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="block w-full pl-10 pr-2 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:ring-cyan-500/20 dark:focus:border-cyan-500 transition-all outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Monitoring Offsets */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 pl-1 flex items-center gap-1">
                    <Timer className="h-3.5 w-3.5" /> Pre-Start Offset
                  </label>
                  <div className="relative group">
                    <input
                      type="number"
                      min={0}
                      value={monitoringStartOffset}
                      onChange={(e) => setMonitoringStartOffset(Number(e.target.value))}
                      className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:ring-cyan-500/20 dark:focus:border-cyan-500 transition-all outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">
                      min
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 pl-1 flex items-center gap-1">
                    <Timer className="h-3.5 w-3.5" /> Post-End Offset
                  </label>
                  <div className="relative group">
                    <input
                      type="number"
                      min={0}
                      value={monitoringEndOffset}
                      onChange={(e) => setMonitoringEndOffset(Number(e.target.value))}
                      className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:ring-cyan-500/20 dark:focus:border-cyan-500 transition-all outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">
                      min
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    Route Configuration
                  </span>
                  {geoJson?.features?.length > 0 ? (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-md text-[10px] font-extrabold uppercase tracking-wide">
                      Route Captured
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 rounded-md text-[10px] font-extrabold uppercase tracking-wide">
                      Awaiting Path
                    </span>
                  )}
                </div>

                {/* Tab Switcher */}
                <div className="flex p-1 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab("manual")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                      activeTab === "manual"
                        ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-cyan-400 shadow-sm"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    <MousePointer2 size={14} />
                    Draw
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("upload")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                      activeTab === "upload"
                        ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-cyan-400 shadow-sm"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    <Upload size={14} />
                    Upload File
                  </button>
                </div>

                {activeTab === "upload" && (
                  <div className="animate-in fade-in zoom-in-95 duration-200">
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={onDrop}
                      className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all ${
                        isDragging
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-slate-200 dark:border-slate-800/60 hover:border-slate-300"
                      }`}
                    >
                      <FileCode size={20} className="text-slate-400 mb-2" />
                      <h3 className="text-[11px] font-bold text-slate-700 dark:text-white uppercase tracking-tight">
                        Drop GPX/KML
                      </h3>
                      <input
                        type="file"
                        accept=".gpx,.kml"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                      />
                    </div>
                    {uploadError && (
                      <p className="text-[9px] font-bold text-rose-500 mt-2 text-center uppercase tracking-widest">
                        {uploadError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto pt-4 flex gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_4px_14px_0_rgba(79,70,229,0.39)]"
              >
                <Route className="w-5 h-5" />
                {isLoading ? "Saving..." : "Save Event"}
              </button>
            </div>
          </form>
        </aside>

        {/* Right Column: Dynamic Map Builder */}
        <main className="flex-1 flex border border-slate-200 dark:border-slate-800 rounded-2xl relative shadow-sm overflow-hidden bg-slate-200 dark:bg-[#0f172a]">
          <MapBuilderWrapper
            onGeoJsonChange={setGeoJson}
            clearTrigger={clearTrigger}
            previewGeojson={activeTab === "upload" ? geoJson : null}
          />

          <div className="absolute bottom-6 right-6 z-[1000]">
            <button
              type="button"
              onClick={handleClearMap}
              className="px-4 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl shadow-lg flex items-center gap-2 font-bold transition-all group"
            >
              <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Clear Selection
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
