"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";
import { formatDistanceToNow } from "date-fns";

// Dynamic items will be fetched from config

type ClaimRecord = {
  item: string;
  guest_name: string;
  created_at: string;
  is_coming: boolean;
};

type GroupedRSVP = {
  id: string;
  guest_name: string;
  items: string[];
  created_at: string;
  is_coming: boolean;
};

export default function SarionGraduation() {
  const [claimedItems, setClaimedItems] = useState<ClaimRecord[]>([]);
  const [groupedRSVPs, setGroupedRSVPs] = useState<GroupedRSVP[]>([]);
  const [guestName, setGuestName] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Event Config State
  const [eventTime, setEventTime] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [availableItems, setAvailableItems] = useState<string[]>([]);

  const fetchItems = async () => {
    try {
      const res = await fetch(`/api/items?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        const items: ClaimRecord[] = data.items || [];
        setClaimedItems(items);

        // Group by guest_name to form RSVP cards (1 card per user)
        const grouped: Record<string, GroupedRSVP> = {};
        items.forEach((c) => {
          // Normalize name for grouping to prevent case-sensitive duplicates
          const key = c.guest_name.trim().toLowerCase(); 
          if (!grouped[key]) {
            grouped[key] = {
              id: key,
              guest_name: c.guest_name, // Preserve original casing
              items: [],
              // API returns DESC, so the first item we see has the most recent timestamp & status
              created_at: c.created_at || new Date().toISOString(),
              is_coming: c.is_coming !== false // Default to true if missing
            };
          }
          grouped[key].items.push(c.item);
        });

        // Sort grouped by created_at DESC
        const sortedGroups = Object.values(grouped).sort((a, b) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        setGroupedRSVPs(sortedGroups);
      }
      // Fetch config concurrently
      const configRes = await fetch(`/api/config?_t=${Date.now()}`);
      if (configRes.ok) {
        const configData = await configRes.json();
        if (configData.config) {
          setEventTime(configData.config.event_time || "This Sunday from 3:00 PM - 8:00 PM");
          setLocationAddress(configData.config.location_address || "6342 W Valencia Drive");
          if (configData.config.available_items && configData.config.available_items.length > 0) {
            setAvailableItems(configData.config.available_items);
          } else {
            // Fallback if empty in DB
            setAvailableItems([
              "Burgers & Buns", "Hot Dogs & Buns", "Cases of Soda", "Cases of Water", 
              "Potato Chips", "Tortilla Chips & Salsa", "Paper Plates & Napkins", 
              "Plastic Cups", "Dessert / Cake", "Salad / Veggie Tray"
            ]);
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchItems();
    const interval = setInterval(fetchItems, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleItem = (item: string) => {
    setSelectedItems((prev) => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const toggleRSVPStatus = async (guest_name: string, current_status: boolean) => {
    const new_status = !current_status;
    
    // Optimistic UI update
    setGroupedRSVPs(prev => prev.map(r => r.guest_name === guest_name ? { ...r, is_coming: new_status } : r));
    setClaimedItems(prev => prev.map(c => c.guest_name === guest_name ? { ...c, is_coming: new_status } : c));
    
    try {
      await fetch('/api/rsvp', {
        method: 'PATCH',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_name, is_coming: new_status }),
      });
      // Silent success, polling will keep it in sync
    } catch (e) {
      console.error("Failed to update status", e);
      fetchItems(); // Revert on failure
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || selectedItems.length === 0) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_name: guestName, items: selectedItems }),
      });
      const data = await res.json();
      if (res.ok) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#EAB308', '#FFFFFF', '#0B1021'] // Theme colors
        });
        
        setGuestName("");
        setSelectedItems([]);
        fetchItems(); 
      } else {
        setErrorMsg(data.error || "Failed to claim items.");
      }
    } catch (e) {
      console.error("Failed to claim items", e);
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // Only count items as claimed if the guest is actually coming
  const activelyClaimedItems = claimedItems.filter(c => c.is_coming !== false);

  return (
    <div className="min-h-screen bg-[url('/background.png')] bg-cover bg-center bg-fixed text-white font-sans selection:bg-yellow-500/30 overflow-hidden relative">
      
      {/* Dark Overlay for Readability */}
      <div className="absolute inset-0 bg-[#0b1021]/80 backdrop-blur-sm z-0"></div>

      <div className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        
        {/* Left Column: Form & Selection */}
        <div className="lg:col-span-7 relative w-full overflow-hidden rounded-3xl bg-[#111827] border border-white/10 shadow-2xl">
          {/* Banner Image */}
          <div className="relative w-full h-64 md:h-80 overflow-hidden border-b border-white/10">
            <Image 
              src="/sarion_graduation_banner.png" 
              alt="Sarion Graduation" 
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-[#111827]/40 to-transparent"></div>
            <div className="absolute bottom-6 left-8 right-8">
              <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                Pizza Graduation Party 🎓
              </h1>
              <p className="text-xl text-yellow-400 mt-2 font-medium drop-shadow-md">What are you bringing?</p>
            </div>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {errorMsg && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-200">
                  {errorMsg}
                </div>
              )}
              
              <div className="space-y-3">
                <label className="text-sm font-semibold text-white/70 uppercase tracking-wider">Your Name</label>
                <input 
                  type="text" 
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter your name..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all text-lg"
                  required
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-semibold text-white/70 uppercase tracking-wider">Select Items to Bring</label>
                  <span className="text-xs text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full font-medium">
                    {activelyClaimedItems.length} / {availableItems.length} Claimed
                  </span>
                </div>

                {loading ? (
                  <div className="text-white/50 animate-pulse py-8 text-center bg-white/5 rounded-xl">Loading the checklist...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableItems.map((item) => {
                      const claimRecord = activelyClaimedItems.find(c => c.item === item);
                      const isClaimed = !!claimRecord;
                      const isSelected = selectedItems.includes(item);

                      return (
                        <div 
                          key={item}
                          onClick={() => !isClaimed && toggleItem(item)}
                          className={`
                            relative overflow-hidden rounded-xl border p-4 transition-all duration-300
                            ${isClaimed 
                              ? 'bg-white/5 border-white/5 cursor-not-allowed opacity-40' 
                              : isSelected 
                                ? 'bg-yellow-500/20 border-yellow-500 cursor-pointer shadow-[0_0_20px_rgba(234,179,8,0.15)] transform scale-[1.02]'
                                : 'bg-white/5 border-white/10 hover:border-white/30 cursor-pointer hover:bg-white/10 hover:scale-[1.01]'
                            }
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`font-semibold ${isClaimed ? 'text-white/40 line-through' : 'text-white'}`}>
                              {item}
                            </span>
                            {isClaimed && (
                              <span className="text-xs bg-white/10 text-white/70 px-2 py-1 rounded-md">
                                {claimRecord.guest_name}
                              </span>
                            )}
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-yellow-500 shrink-0 flex items-center justify-center shadow-lg shadow-yellow-500/50">
                                <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                disabled={!guestName || selectedItems.length === 0 || submitting}
                className="w-full relative overflow-hidden group bg-gradient-to-r from-yellow-600 to-yellow-400 disabled:from-white/10 disabled:to-white/5 disabled:text-white/30 disabled:cursor-not-allowed text-black font-extrabold text-lg py-5 rounded-2xl shadow-xl transition-all"
              >
                <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out disabled:hidden"></div>
                <span className="relative z-10">
                  {submitting ? 'Confirming...' : `Confirm ${selectedItems.length > 0 ? selectedItems.length : ''} ${selectedItems.length === 1 ? 'Item' : 'Items'}`}
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Live Feed */}
        <div className="lg:col-span-5 flex flex-col h-full max-h-[90vh]">
          
          {/* Location & Time Banner */}
          {locationAddress ? (
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-8 p-5 rounded-3xl bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.1)] backdrop-blur-md flex items-center justify-between gap-4 group hover:bg-yellow-500/20 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-5">
                <div className="bg-yellow-500/20 p-3 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.3)] border border-yellow-500/50 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-yellow-400 tracking-wide uppercase">
                    {eventTime || "Event Location"}
                  </h3>
                  <p className="text-sm text-white/80 font-medium mt-1 group-hover:text-white transition-colors line-clamp-1">
                    {locationAddress}
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 group-hover:bg-yellow-500 group-hover:border-yellow-400 transition-colors">
                <svg className="w-5 h-5 text-white/50 group-hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>
          ) : (
            <div className="mb-8 p-5 rounded-3xl bg-gradient-to-br from-yellow-500/5 to-transparent border border-yellow-500/10 shadow-[0_0_30px_rgba(234,179,8,0.02)] backdrop-blur-md flex items-center gap-5">
              <div className="bg-yellow-500/10 p-3 rounded-full shadow-inner border border-yellow-500/20">
                <svg className="w-7 h-7 text-yellow-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-yellow-400/80 tracking-wide uppercase">Location & Time</h3>
                <p className="text-sm text-white/40 font-medium mt-1">To be announced soon. Keep an eye out!</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-6 px-2">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
              </span>
              Live RSVPs
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {groupedRSVPs.length === 0 && !loading && (
              <div className="text-center p-10 bg-white/5 border border-white/5 rounded-2xl">
                <p className="text-white/40 font-medium">No RSVPs yet. Be the first!</p>
              </div>
            )}
            
            {groupedRSVPs.map((rsvp, index) => {
              let timeString = "";
              try {
                timeString = formatDistanceToNow(new Date(rsvp.created_at), { addSuffix: true });
              } catch {
                timeString = "Recently";
              }

              const isComing = rsvp.is_coming;
              // Animate only the newest one subtly
              const isNewest = index === 0 && new Date().getTime() - new Date(rsvp.created_at).getTime() < 10000;

              return (
                <div 
                  key={rsvp.id}
                  className={`
                    p-5 rounded-2xl backdrop-blur-md transition-all duration-500
                    ${!isComing 
                      ? 'bg-red-900/10 border border-red-500/30 opacity-75' 
                      : isNewest 
                        ? 'bg-yellow-500/10 border border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.15)]' 
                        : 'bg-white/5 border border-white/10'
                    }
                  `}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-1">
                      <h3 className={`font-bold text-lg ${!isComing ? 'text-red-200/70' : 'text-white'}`}>
                        {rsvp.guest_name}
                      </h3>
                      <span className="text-xs font-medium text-white/40">
                        {timeString}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => toggleRSVPStatus(rsvp.guest_name, isComing)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-md
                        ${isComing 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                          : 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                        }`}
                    >
                      {isComing ? 'Coming' : 'Not Coming'}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    {rsvp.items.map(item => (
                      <span 
                        key={item} 
                        className={`text-sm px-3 py-1 rounded-full transition-all duration-300
                          ${!isComing 
                            ? 'bg-red-900/30 text-red-200/50 line-through' 
                            : isNewest 
                              ? 'bg-yellow-500/20 text-yellow-200' 
                              : 'bg-white/10 text-white/80'
                          }`}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
