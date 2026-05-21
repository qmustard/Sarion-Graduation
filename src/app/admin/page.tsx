"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

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

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<'config' | 'guests' | 'items'>('config');

  // Config State
  const [eventTime, setEventTime] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [availableItems, setAvailableItems] = useState<string[]>([
    "Burgers & Buns", "Hot Dogs & Buns", "Cases of Soda", "Cases of Water", 
    "Potato Chips", "Tortilla Chips & Salsa", "Paper Plates & Napkins", 
    "Plastic Cups", "Dessert / Cake", "Salad / Veggie Tray"
  ]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState("");
  const [newItemName, setNewItemName] = useState("");

  // Guests State
  const [groupedRSVPs, setGroupedRSVPs] = useState<GroupedRSVP[]>([]);
  const [claimedItems, setClaimedItems] = useState<ClaimRecord[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  
  // Manual Add State
  const [newGuestName, setNewGuestName] = useState("");
  const [newSelectedItems, setNewSelectedItems] = useState<string[]>([]);
  const [addingGuest, setAddingGuest] = useState(false);
  const [guestMessage, setGuestMessage] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === "963" || pin === "137") {
      setAuthenticated(true);
      fetchConfig();
      fetchGuests();
    } else {
      setPinError(true);
      setPin("");
    }
  };

  const fetchConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch(`/api/config?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setEventTime(data.config.event_time || "");
          setLocationAddress(data.config.location_address || "");
          if (data.config.available_items && data.config.available_items.length > 0) {
            setAvailableItems(data.config.available_items);
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch config", e);
    } finally {
      setLoadingConfig(false);
    }
  };

  const fetchGuests = async () => {
    setLoadingGuests(true);
    try {
      const res = await fetch(`/api/items?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        const items: ClaimRecord[] = data.items || [];
        setClaimedItems(items);

        const grouped: Record<string, GroupedRSVP> = {};
        items.forEach((c) => {
          const key = c.guest_name.trim().toLowerCase(); 
          if (!grouped[key]) {
            grouped[key] = {
              id: key,
              guest_name: c.guest_name,
              items: [],
              created_at: c.created_at || new Date().toISOString(),
              is_coming: c.is_coming !== false
            };
          }
          grouped[key].items.push(c.item);
        });

        const sortedGroups = Object.values(grouped).sort((a, b) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        setGroupedRSVPs(sortedGroups);
      }
    } catch (e) {
      console.error("Failed to fetch guests", e);
    } finally {
      setLoadingGuests(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigMessage("");
    
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          event_time: eventTime, 
          location_address: locationAddress,
          available_items: availableItems 
        }),
      });
      
      if (res.ok) {
        setConfigMessage("Successfully updated configuration!");
      } else {
        setConfigMessage("Error saving configuration.");
      }
    } catch (e) {
      console.error("Failed to save", e);
      setConfigMessage("An unexpected error occurred.");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setAvailableItems(prev => [...prev, newItemName.trim()]);
    setNewItemName("");
    setConfigMessage("Item added. Remember to click Save Configuration!");
  };

  const handleRemoveItem = (indexToRemove: number) => {
    setAvailableItems(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setConfigMessage("Item removed. Remember to click Save Configuration!");
  };

  const handleUpdateItem = (index: number, newName: string) => {
    setAvailableItems(prev => {
      const copy = [...prev];
      copy[index] = newName;
      return copy;
    });
  };

  const moveItemUp = (index: number) => {
    if (index === 0) return;
    setAvailableItems(prev => {
      const copy = [...prev];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
    setConfigMessage("List reordered. Remember to click Save Configuration!");
  };

  const moveItemDown = (index: number) => {
    if (index === availableItems.length - 1) return;
    setAvailableItems(prev => {
      const copy = [...prev];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy;
    });
    setConfigMessage("List reordered. Remember to click Save Configuration!");
  };

  const handleDeleteGuest = async (guest_name: string) => {
    if (!confirm(`Are you sure you want to completely delete ${guest_name}'s RSVP? This cannot be undone.`)) {
      return;
    }
    
    // Optimistic delete
    setGroupedRSVPs(prev => prev.filter(r => r.guest_name !== guest_name));
    setClaimedItems(prev => prev.filter(c => c.guest_name !== guest_name));

    try {
      const res = await fetch('/api/rsvp', {
        method: 'DELETE',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_name }),
      });
      if (!res.ok) {
        fetchGuests(); // Revert on failure
      }
    } catch (e) {
      console.error("Failed to delete", e);
      fetchGuests();
    }
  };

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuestName || newSelectedItems.length === 0) return;
    
    setAddingGuest(true);
    setGuestMessage("");
    
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_name: newGuestName, items: newSelectedItems }),
      });
      if (res.ok) {
        setNewGuestName("");
        setNewSelectedItems([]);
        setGuestMessage("Guest successfully added.");
        fetchGuests();
      } else {
        setGuestMessage("Failed to add guest.");
      }
    } catch (e) {
      console.error("Failed to add guest", e);
      setGuestMessage("Unexpected error occurred.");
    } finally {
      setAddingGuest(false);
    }
  };

  const toggleNewItem = (item: string) => {
    setNewSelectedItems((prev) => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
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

  const activelyClaimedItems = claimedItems.filter(c => c.is_coming !== false);

  return (
    <div className="min-h-screen bg-[#0b1021] text-white font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-extrabold flex items-center gap-3">
            <span className="text-yellow-500">⚙</span> Command Center
          </h1>
          <a href="/" className="text-sm font-medium text-white/50 hover:text-yellow-400 transition-colors">
            ← Back to Live Page
          </a>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 bg-white/5 p-1.5 rounded-2xl border border-white/10">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider rounded-xl transition-all ${
              activeTab === 'config' 
                ? 'bg-yellow-500 text-black shadow-md' 
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Event Settings
          </button>
          <button
            onClick={() => setActiveTab('guests')}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider rounded-xl transition-all ${
              activeTab === 'guests' 
                ? 'bg-yellow-500 text-black shadow-md' 
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Guest List
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider rounded-xl transition-all ${
              activeTab === 'items' 
                ? 'bg-yellow-500 text-black shadow-md' 
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Item Master List
          </button>
        </div>

        {/* Tab Content: Item Master List */}
        {activeTab === 'items' && (
          <div className="bg-[#111827] border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-8 relative mb-6">
            <h2 className="text-xl font-bold text-white mb-2">Available Items</h2>
            <p className="text-sm text-white/50 mb-6">Manage the master list of items guests can bring.</p>
            
            {configMessage && (
              <div className={`p-4 mb-6 rounded-xl border font-medium ${configMessage.includes("Error") ? 'bg-red-500/20 border-red-500/50 text-red-200' : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'}`}>
                {configMessage}
              </div>
            )}

            <div className="space-y-3 mb-8 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {availableItems.map((item, index) => (
                <div key={index} className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-xl transition-all hover:bg-white/10">
                  <span className="text-white/30 font-mono text-sm">{index + 1}.</span>
                  <input 
                    type="text" 
                    value={item}
                    onChange={(e) => handleUpdateItem(index, e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-white font-medium"
                  />
                  <div className="flex gap-1">
                    <button 
                      onClick={() => moveItemUp(index)}
                      disabled={index === 0}
                      className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move up"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => moveItemDown(index)}
                      disabled={index === availableItems.length - 1}
                      className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move down"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => handleRemoveItem(index)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors ml-2"
                      title="Remove item"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {availableItems.length === 0 && (
                <p className="text-white/40 text-center py-4">No items available.</p>
              )}
            </div>

            <form onSubmit={handleAddItem} className="flex gap-3 mb-6">
              <input 
                type="text" 
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Add a new item..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all"
              />
              <button 
                type="submit" 
                disabled={!newItemName.trim()}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 disabled:bg-white/5 text-white disabled:text-white/30 font-bold rounded-xl border border-white/20 transition-all"
              >
                Add Item
              </button>
            </form>

            <button 
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="w-full relative overflow-hidden group bg-gradient-to-r from-yellow-600 to-yellow-400 disabled:from-white/10 disabled:to-white/5 disabled:text-white/30 text-black font-extrabold text-lg py-5 rounded-2xl shadow-[0_0_20px_rgba(234,179,8,0.15)] hover:shadow-[0_0_40px_rgba(234,179,8,0.3)] transition-all"
            >
              <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out disabled:hidden"></div>
              <span className="relative z-10">
                {savingConfig ? 'Saving...' : 'Save Configuration'}
              </span>
            </button>
          </div>
        )}

        {/* Tab Content: Event Config */}
        {activeTab === 'config' && (
          <div className="bg-[#111827] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent pointer-events-none"></div>
            
            <div className="p-8 relative z-10">
              {loadingConfig ? (
                <div className="animate-pulse space-y-6">
                  <div className="h-12 bg-white/5 rounded-xl"></div>
                  <div className="h-12 bg-white/5 rounded-xl"></div>
                </div>
              ) : (
                <form onSubmit={handleSaveConfig} className="space-y-8">
                  
                  {configMessage && (
                    <div className={`p-4 rounded-xl border font-medium ${configMessage.includes("Error") ? 'bg-red-500/20 border-red-500/50 text-red-200' : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'}`}>
                      {configMessage}
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
                    <p className="text-xs text-white/40">If provided, this generates a clickable Google Maps link on the main page.</p>
                  </div>

                  <button 
                    type="submit" 
                    disabled={savingConfig}
                    className="w-full relative overflow-hidden group bg-gradient-to-r from-yellow-600 to-yellow-400 disabled:from-white/10 disabled:to-white/5 disabled:text-white/30 text-black font-extrabold text-lg py-5 rounded-2xl shadow-[0_0_20px_rgba(234,179,8,0.15)] hover:shadow-[0_0_40px_rgba(234,179,8,0.3)] transition-all mt-4"
                  >
                    <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out disabled:hidden"></div>
                    <span className="relative z-10">
                      {savingConfig ? 'Saving...' : 'Save Configuration'}
                    </span>
                  </button>
                  
                </form>
              )}
            </div>
          </div>
        )}

        {/* Tab Content: Guests */}
        {activeTab === 'guests' && (
          <div className="space-y-6">
            
            {/* Live Guest List */}
            <div className="bg-[#111827] border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">RSVP Roster</h2>
              
              {loadingGuests ? (
                <div className="text-center py-8 text-white/40">Loading guests...</div>
              ) : groupedRSVPs.length === 0 ? (
                <div className="text-center py-8 text-white/40">No RSVPs yet.</div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {groupedRSVPs.map(rsvp => {
                    let timeString = "";
                    try {
                      timeString = formatDistanceToNow(new Date(rsvp.created_at), { addSuffix: true });
                    } catch {
                      timeString = "Recently";
                    }

                    return (
                      <div key={rsvp.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg text-white">{rsvp.guest_name}</h3>
                            {!rsvp.is_coming && (
                              <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-md font-medium border border-red-500/30">Not Coming</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {rsvp.items.map(item => (
                              <span key={item} className={`text-xs px-2 py-1 rounded-md ${rsvp.is_coming ? 'bg-white/10 text-white/70' : 'bg-red-900/30 text-red-200/50 line-through'}`}>
                                {item}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-white/30 mt-2">{timeString}</p>
                        </div>
                        
                        <button
                          onClick={() => handleDeleteGuest(rsvp.guest_name)}
                          className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500/50 rounded-xl text-sm font-bold transition-all whitespace-nowrap shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Admin Override: Add Guest */}
            <div className="bg-[#111827] border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6 relative">
              <div className="absolute top-0 right-0 p-4">
                <span className="bg-red-500/20 text-red-400 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-red-500/30">
                  Admin Override
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Manual Entry</h2>
              <p className="text-sm text-white/50 mb-6">Force-add a guest and claim items directly.</p>
              
              <form onSubmit={handleAddGuest} className="space-y-6">
                {guestMessage && (
                  <div className={`p-4 rounded-xl border font-medium ${guestMessage.includes("Error") || guestMessage.includes("Failed") ? 'bg-red-500/20 border-red-500/50 text-red-200' : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'}`}>
                    {guestMessage}
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-semibold text-white/70 uppercase tracking-wider block mb-2">Guest Name</label>
                  <input 
                    type="text" 
                    value={newGuestName}
                    onChange={(e) => setNewGuestName(e.target.value)}
                    placeholder="Enter name..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-white/70 uppercase tracking-wider block mb-3">Assign Items</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {availableItems.map((item) => {
                      const claimRecord = activelyClaimedItems.find(c => c.item === item);
                      const isClaimed = !!claimRecord;
                      const isSelected = newSelectedItems.includes(item);

                      return (
                        <div 
                          key={item}
                          onClick={() => toggleNewItem(item)}
                          className={`
                            relative overflow-hidden rounded-xl border p-3 transition-all duration-300 text-sm
                            ${isClaimed 
                              ? 'bg-red-900/10 border-red-500/20 cursor-not-allowed opacity-50' 
                              : isSelected 
                                ? 'bg-yellow-500/20 border-yellow-500 cursor-pointer shadow-[0_0_15px_rgba(234,179,8,0.1)]'
                                : 'bg-white/5 border-white/10 hover:border-white/30 cursor-pointer hover:bg-white/10'
                            }
                          `}
                        >
                          <div className="flex flex-col">
                            <span className={`font-semibold ${isClaimed ? 'text-white/40 line-through' : 'text-white'}`}>
                              {item}
                            </span>
                            {isClaimed && (
                              <span className="text-xs text-red-400 mt-1 font-medium">
                                Taken by {claimRecord.guest_name}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={!newGuestName || newSelectedItems.length === 0 || addingGuest}
                  className="w-full bg-white/10 hover:bg-white/20 disabled:bg-white/5 text-white disabled:text-white/30 font-bold py-4 rounded-xl border border-white/20 disabled:border-white/5 transition-all"
                >
                  {addingGuest ? 'Adding...' : 'Force Add Guest'}
                </button>
              </form>
            </div>
            
          </div>
        )}

      </div>
    </div>
  );
}
