"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import confetti from "canvas-confetti";

export default function FlyerPage() {
  useEffect(() => {
    // Fire a massive golden confetti blast on load
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#EAB308', '#CA8A04', '#FFFFFF']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#EAB308', '#CA8A04', '#FFFFFF']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  const googleMapsUrl = "https://maps.google.com/?q=6342+W+Valencia+Drive+Laveen+AZ+85339";

  return (
    <div className="min-h-screen bg-[#0b1021] flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-3xl max-h-3xl bg-yellow-500/10 blur-[100px] rounded-full pointer-events-none z-0"></div>

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center">
        
        {/* Glassmorphic Frame for the Flyer */}
        <div className="relative w-full aspect-[4/5] sm:aspect-square bg-[#111827] border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] mb-8">
          <Image 
            src="/pizza_flyer.png"
            alt="Pizza Graduation Party Flyer"
            fill
            className="object-contain sm:object-cover hover:scale-[1.02] transition-transform duration-700"
            priority
          />
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row gap-4 justify-center items-center">
          
          {/* Maps Button */}
          <a 
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-1/2 relative overflow-hidden group bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all hover:border-yellow-500/50 hover:shadow-[0_0_30px_rgba(234,179,8,0.2)]"
          >
            <span className="text-3xl">📍</span>
            <span className="text-white font-bold tracking-wider uppercase text-sm">Get Directions</span>
          </a>

          {/* RSVP Button */}
          <Link 
            href="/"
            className="w-full sm:w-1/2 relative overflow-hidden group bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_40px_rgba(234,179,8,0.5)] transition-all"
          >
            <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
            <span className="relative z-10 text-3xl">🍕</span>
            <span className="relative z-10 text-black font-extrabold tracking-wider uppercase text-sm drop-shadow-sm">What are you bringing?</span>
          </Link>

        </div>
      </div>
    </div>
  );
}
