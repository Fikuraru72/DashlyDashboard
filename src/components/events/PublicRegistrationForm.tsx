"use client";

import React, { useState } from "react";
import { Download, CheckCircle2, User, Mail, Phone, ShieldCheck, FileText } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import jsPDF from "jspdf";

export default function PublicRegistrationForm({ 
  eventId, 
  eventStatus,
  eventName,
  eventDate,
  eventLocation
}: { 
  eventId: number, 
  eventStatus: string,
  eventName?: string,
  eventDate?: string,
  eventLocation?: string
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<{ bibNumber: string, qrCode?: string, message: string, token?: string } | null>(null);

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("Event Registration Ticket", 105, 20, { align: "center" });
    
    // Event Details
    doc.setFontSize(16);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(eventName || "Dashly Event", 105, 35, { align: "center" });
    
    doc.setFontSize(12);
    if (eventDate) {
      doc.text(`Date: ${new Date(eventDate).toLocaleDateString()}`, 105, 45, { align: "center" });
    }
    if (eventLocation) {
      doc.text(`Location: ${eventLocation}`, 105, 52, { align: "center" });
    }
    
    // Line separator
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.line(20, 60, 190, 60);
    
    // Participant
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text(`Participant: ${name}`, 20, 75);
    doc.text(`Email: ${email}`, 20, 83);
    if (phone) {
      doc.text(`Phone: ${phone}`, 20, 91);
    }
    
    // BIB
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("YOUR BIB NUMBER:", 105, 110, { align: "center" });
    doc.setFontSize(48);
    doc.setFont("helvetica", "bold");
    doc.text(successData?.bibNumber || "", 105, 130, { align: "center" });
    doc.setFont("helvetica", "normal");
    
    // QR Code
    const qrElement = document.getElementById("qr-canvas") as HTMLCanvasElement;
    if (qrElement) {
      const qrDataUrl = qrElement.toDataURL("image/png");
      doc.addImage(qrDataUrl, "PNG", 75, 150, 60, 60);
    }
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("Scan this QR code in the Dashly app for quick access.", 105, 220, { align: "center" });
    
    // Border
    doc.setDrawColor(79, 70, 229); // indigo-600
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 277);
    
    doc.save(`Ticket-${eventName?.replace(/\s+/g, '-') || 'Event'}-${successData?.bibNumber}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${apiUrl}/public-events/${eventId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to register");
      }

      setSuccessData(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const normalizedStatus = eventStatus?.toUpperCase() || "";

  if (normalizedStatus !== "IDLE" && normalizedStatus !== "REGISTRATION_OPEN") {
    return (
      <div className="w-full py-4 bg-slate-800 text-slate-400 rounded-xl font-bold flex items-center justify-center text-center cursor-not-allowed">
        Registration {normalizedStatus === 'REGISTRATION_CLOSED' ? 'Closed' : 'Unavailable'}
      </div>
    );
  }

  if (successData) {
    return (
      <div className="space-y-4">
        <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mb-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <h4 className="font-bold text-emerald-400 text-lg">Registration Successful!</h4>
          <p className="text-sm text-slate-300">
            {successData.message}
          </p>

          <div className="py-4 border-y border-emerald-500/20 my-4 flex flex-col items-center">
            <p className="text-xs text-emerald-400/80 font-bold uppercase tracking-widest mb-1">YOUR BIB NUMBER</p>
            <p className="text-3xl font-black text-white tracking-wider mb-4">{successData.bibNumber}</p>
            {successData.token && (
              <div className="bg-white p-2 rounded-xl inline-block shadow-sm">
                <QRCodeCanvas id="qr-canvas" value={successData.token} size={150} />
              </div>
            )}
            <p className="text-xs text-slate-400 mt-2">Scan this QR in the Dashly app to quickly find this event.</p>
          </div>

          <button 
            onClick={generatePDF}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/25 mb-4"
          >
            <FileText className="w-5 h-5" /> Download Ticket (PDF)
          </button>

          <div className="pt-2">
            <h5 className="font-bold text-slate-200 mb-3 text-sm">Next Steps:</h5>
            <ol className="text-sm text-slate-400 text-left space-y-2 list-decimal list-inside bg-slate-900/50 p-4 rounded-xl">
              <li>Download the <b>Dashly App</b> from the store.</li>
              <li>Login using your email: <b>{email}</b></li>
              <li>Go to <b>Explore</b> and scan the QR code above.</li>
              <li>Click <b>Verify BIB</b> and enter <b>{successData.bibNumber}</b>.</li>
            </ol>
          </div>

          <a href="/#download" className="mt-4 w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-emerald-500/25">
            <Download className="w-4 h-4" /> Download Dashly App
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-5 bg-slate-800/50 border border-slate-700/50 rounded-2xl">
        <h4 className="font-bold text-white mb-1">Register Now</h4>
        <p className="text-sm text-slate-400 mb-6">Enter your details to secure your spot and get your BIB number.</p>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User size={16} />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="Full Name"
              />
            </div>
          </div>
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail size={16} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="Email Address"
              />
            </div>
          </div>
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Phone size={16} />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="Phone Number (Optional)"
              />
            </div>
          </div>
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <ShieldCheck size={16} />
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="Create a Password for Mobile Login"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-xl font-bold flex items-center justify-center transition-all shadow-lg hover:shadow-indigo-500/25 mt-2"
          >
            {loading ? "Registering..." : "Complete Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}
