"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);

  const [eventTime, setEventTime] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === "963" || pin === "137") { // Simple protection
      setAuthenticated(true);
      fetchConfig();
    } else {
      setPinError(true);
      setPin("");
    }
  };

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/config?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setEventTime(data.config.event_time || "");
          setLocationAddress(data.config.location_address || "");
        }
      }
    } catch (e) {
      console.error("Failed to fetch config", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_time: eventTime, location_address: locationAddress }),
      });
      
      if (res.ok) {
        setMessage("Successfully updated event configuration!");
      } else {
        setMessage("Error saving configuration.");
      }
    } catch (e) {
      console.error("Failed to save", e);
      setMessage("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0b1021] flex items-center justify-center p-4">
        <div className="bg-[#111827] border border-white/10 p-8 rounded-3xl shadow-2xl w-full max-w-md backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent"></div>
          
          <div className="relative z-10">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center border border-yellow-500/30">
                <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-white text-center mb-2">Admin Access</h1>
            <p className="text-white/50 text-center mb-8 text-sm">Enter pin to manage event details</p>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => { setPin(e.target.value); setPinError(false); }}
                  placeholder="Enter PIN"
                  className={`w-full bg-white/5 border ${pinError ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/10 focus:ring-yellow-500/50'} rounded-xl px-5 py-4 text-center text-white placeholder-white/30 focus:outline-none focus:ring-2 transition-all text-xl tracking-[0.5em] font-mono`}
                  autoFocus
                />
                {pinError && <p className="text-red-400 text-xs text-center mt-2 font-medium">Incorrect PIN</p>}
              </div>
              
              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-extrabold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] transition-all"
              >
                Unlock
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1021] text-white font-sans p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-extrabold flex items-center gap-3">
            <span className="text-yellow-500">⚙</span> Event Configuration
          </h1>
          <a href="/" className="text-sm font-medium text-white/50 hover:text-yellow-400 transition-colors">
            ← Back to Live Page
          </a>
        </div>

        <div className="bg-[#111827] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent pointer-events-none"></div>
          
          <div className="p-8 relative z-10">
            {loading ? (
              <div className="animate-pulse space-y-6">
                <div className="h-12 bg-white/5 rounded-xl"></div>
                <div className="h-12 bg-white/5 rounded-xl"></div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-8">
                
                {message && (
                  <div className={`p-4 rounded-xl border font-medium ${message.includes("Error") ? 'bg-red-500/20 border-red-500/50 text-red-200' : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'}`}>
                    {message}
                  </div>
                )}
                
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-white/70 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Event Time
                  </label>
                  <input 
                    type="text" 
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    placeholder="e.g., Saturday, June 12th @ 4:00 PM"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all"
                  />
                  <p className="text-xs text-white/40">This will be displayed on the Live RSVP page.</p>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-white/70 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Location Address
                  </label>
                  <input 
                    type="text" 
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    placeholder="e.g., 123 Main St, City, ST 12345"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all"
                  />
                  <p className="text-xs text-white/40">If provided, this will generate a clickable Google Maps "Get Directions" link on the main page.</p>
                </div>

                <button 
                  type="submit" 
                  disabled={saving}
                  className="w-full relative overflow-hidden group bg-gradient-to-r from-yellow-600 to-yellow-400 disabled:from-white/10 disabled:to-white/5 disabled:text-white/30 text-black font-extrabold text-lg py-5 rounded-2xl shadow-[0_0_20px_rgba(234,179,8,0.15)] hover:shadow-[0_0_40px_rgba(234,179,8,0.3)] transition-all mt-4"
                >
                  <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out disabled:hidden"></div>
                  <span className="relative z-10">
                    {saving ? 'Saving...' : 'Save Configuration'}
                  </span>
                </button>
                
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
