"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import Image from "next/image";

// 1. Static Image Database for TrekMate
// You can add more forts here easily!
const TREK_IMAGES: Record<string, string[]> = {
  "rajgad": [
    "https://images.unsplash.com/photo-1623164344075-472b83441999?w=800&q=80",
    "https://images.unsplash.com/photo-1623955615783-f368f3066347?w=800&q=80",
    "https://images.unsplash.com/photo-1616428784379-389f47021376?w=800&q=80"
  ],
  "raigad": [
    "https://images.unsplash.com/photo-1597818808369-63309e236ce3?w=800&q=80", 
    "https://images.unsplash.com/photo-1615967733475-b6d396792644?w=800&q=80"
  ],
  "torna": [
    "https://images.unsplash.com/photo-1613280540702-693339023420?w=800&q=80",
    "https://images.unsplash.com/photo-1634999468936-224443907a50?w=800&q=80"
  ],
  "kalsubai": [
    "https://www.google.com/imgres?q=kalsubai%20trek&imgurl=https%3A%2F%2Fstatic.wixstatic.com%2Fmedia%2F9716d0_b5247f839c8741309c1f1775fa2e0fb5~mv2.jpg%2Fv1%2Ffill%2Fw_548%2Ch_388%2Cal_c%2Cq_80%2Cusm_0.66_1.00_0.01%2Cenc_auto%2F9716d0_b5247f839c8741309c1f1775fa2e0fb5~mv2.jpg&imgrefurl=https%3A%2F%2Fwww.mumbaitrekkers.com%2Fevent-page%2Fkalsubai-monsoon&docid=3LzkN3OCZwYtDM&tbnid=NXo5qya0Lr8F2M&vet=12ahUKEwiKk5isg5KRAxUoXGwGHVcACP8QM3oECBgQAA..i&w=548&h=388&hcb=2&ved=2ahUKEwiKk5isg5KRAxUoXGwGHVcACP8QM3oECBgQAA",
    "https://www.google.com/imgres?q=kalsubai%20trek&imgurl=https%3A%2F%2Fwww.treksandtrails.org%2Fsystem%2Fimages%2F000%2F313%2F799%2Fc25f4f1f55e9272e9697d3e8b58d0241%2Foriginal%2FKalsubai_Gopro_6_10.jpeg&imgrefurl=https%3A%2F%2Fwww.treksandtrails.org%2Ftours%2Fkalsubai-monsoon-trek-2025&docid=p57wEcEXgIwXFM&tbnid=6dXMFXfOKwd4CM&vet=12ahUKEwiKk5isg5KRAxUoXGwGHVcACP8QM3oECCkQAA..i&w=1280&h=853&hcb=2&ved=2ahUKEwiKk5isg5KRAxUoXGwGHVcACP8QM3oECCkQAA"
  ],
  "sinhagad": [
    "https://images.unsplash.com/photo-1627894483216-2138af692e32?w=800&q=80",
    "https://images.unsplash.com/photo-1631527696350-f942d9929949?w=800&q=80"
  ],
  "harishchandragad": [
    "https://images.unsplash.com/photo-1623698717672-2d93d463e264?w=800&q=80", // Konkan Kada lookalike
    "https://images.unsplash.com/photo-1574692797204-74720979e262?w=800&q=80"
  ],
  // Fallback for unknown treks
  "default": [
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80"
  ]
};

interface PhotoCarouselProps {
  location: string;
}

export function PhotoCarousel({ location }: PhotoCarouselProps) {
  const normalizedLocation = location.toLowerCase().trim();
  
  // Find images that match the location name (partial match)
  const matchedKey = Object.keys(TREK_IMAGES).find(key => normalizedLocation.includes(key)) || "default";
  const images = TREK_IMAGES[matchedKey];

  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  return (
    <div className="my-4 w-full max-w-md mx-auto rounded-xl overflow-hidden shadow-xl border-4 border-stone-100 dark:border-stone-800 bg-white dark:bg-black relative group">
      {/* Title Badge */}
      <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
        <MapPin className="w-3 h-3 text-emerald-400" />
        {matchedKey === "default" ? location : matchedKey}
      </div>

      <div className="relative aspect-video w-full">
        <img
          src={images[currentIndex]}
          alt={`${location} view`}
          className="w-full h-full object-cover transition-all duration-500"
        />
        
        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={prevSlide}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={nextSlide}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </>
        )}

        {/* Dots Indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex ? "bg-emerald-500 w-4" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
