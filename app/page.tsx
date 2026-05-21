"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const standardItems = [
  "Burgers & Buns",
  "Hot Dogs & Buns",
  "Cases of Soda",
  "Cases of Water",
  "Potato Chips",
  "Tortilla Chips & Salsa",
  "Paper Plates & Napkins",
  "Plastic Cups",
  "Dessert / Cake",
  "Salad / Veggie Tray",
];

export default function SarionGraduation() {
  const [claimedItems, setClaimedItems] = useState<{item: string, guest_name: string}[]>([]);
  const [guestName, setGuestName] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/items");
      if (res.ok) {
        const data = await res.json();
        setClaimedItems(data.items || []);
      }
    } catch (e) {
      console.error("Failed to fetch claimed items", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // Poll every 5s to keep the list live
    const interval = setInterval(fetchItems, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !selectedItem) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_name: guestName, item: selectedItem }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Thank you, ${guestName}! We have you down for ${selectedItem}.`);
        setGuestName("");
        setSelectedItem("");
        fetchItems(); // Refresh list instantly
      } else {
        setErrorMsg(data.error || "Failed to claim item.");
      }
    } catch (e) {
      console.error("Failed to claim item", e);
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-[#0b1021]">
      <div 
        className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-3xl bg-[#0b1021] border border-white/10 shadow-2xl"
      >
        {/* Banner Image */}
        <div className="relative w-full h-64 md:h-80 overflow-hidden rounded-t-3xl border-b border-white/10">
          <Image 
            src="/sarion_graduation_banner.png" 
            alt="Sarion Graduation" 
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1021] to-transparent"></div>
          <div className="absolute bottom-6 left-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
              Sarion's Graduation Party
            </h1>
            <p className="text-xl text-yellow-300 mt-2 font-medium drop-shadow-md">What are you bringing?</p>
          </div>
        </div>

        <div className="p-8">
          {successMsg ? (
            <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-2xl p-8 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-white mb-2">Awesome!</h2>
              <p className="text-emerald-200 text-lg">{successMsg}</p>
              <button 
                onClick={() => setSuccessMsg("")}
                className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white font-medium transition-colors"
              >
                Bring something else?
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMsg && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200">
                  {errorMsg}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/70 uppercase tracking-wider">Your Name</label>
                <input 
                  type="text" 
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter your name..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all"
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-white/70 uppercase tracking-wider">Select an Item to Bring</label>
                {loading ? (
                  <div className="text-white/50 animate-pulse py-4">Loading the list...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {standardItems.map((item) => {
                      const claimRecord = claimedItems.find(c => c.item === item);
                      const isClaimed = !!claimRecord;
                      const isSelected = selectedItem === item;

                      return (
                        <div 
                          key={item}
                          onClick={() => !isClaimed && setSelectedItem(item)}
                          className={`
                            relative overflow-hidden rounded-xl border p-4 transition-all duration-200
                            ${isClaimed 
                              ? 'bg-white/5 border-white/5 cursor-not-allowed opacity-50' 
                              : isSelected 
                                ? 'bg-yellow-500/20 border-yellow-500 cursor-pointer shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                                : 'bg-white/5 border-white/10 hover:border-white/30 cursor-pointer hover:bg-white/10'
                            }
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`font-medium ${isClaimed ? 'text-white/50 line-through' : 'text-white'}`}>
                              {item}
                            </span>
                            {isClaimed && (
                              <span className="text-xs bg-white/10 text-white/70 px-2 py-1 rounded-md">
                                Claimed by {claimRecord.guest_name}
                              </span>
                            )}
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-yellow-500 shrink-0" />
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
                disabled={!guestName || !selectedItem || submitting}
                className="w-full mt-6 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-lg py-4 rounded-xl shadow-lg transition-all"
              >
                {submitting ? 'Confirming...' : 'Confirm My Item'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
