"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2, AlertCircle, Search } from "lucide-react";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface AddressMapProps {
  address: string;
  onAddressChange: (address: string) => void;
}

export default function AddressInput({ address, onAddressChange }: AddressMapProps) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapError, setMapError] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions from Nominatim
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 4) {
      setSuggestions([]);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const searchQuery = query.includes("Argentina")
        ? query
        : `${query}, Argentina`;

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1&countrycodes=ar`,
        { headers: { "Accept-Language": "es" } }
      );
      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  // Debounced search as user types
  const handleInputChange = (value: string) => {
    onAddressChange(value);
    setSelectedCoords(null);
    setMapError(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 600);
  };

  // When user selects a suggestion
  const handleSelect = (result: NominatimResult) => {
    // Format a cleaner address from display_name
    const parts = result.display_name.split(", ");
    // Take first 3-4 parts for a clean address
    const cleanAddress = parts.slice(0, Math.min(parts.length, 4)).join(", ");
    onAddressChange(cleanAddress);
    setSelectedCoords({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
    setShowSuggestions(false);
    setSuggestions([]);
    setMapError(false);
  };

  // Geocode manually if user types and presses enter or blurs without selecting
  const handleBlurGeocode = useCallback(async () => {
    // Small delay to allow click on suggestion
    setTimeout(() => setShowSuggestions(false), 200);

    if (selectedCoords || address.trim().length < 5) return;

    try {
      const searchQuery = address.includes("Argentina")
        ? address
        : `${address}, Argentina`;

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&countrycodes=ar`,
        { headers: { "Accept-Language": "es" } }
      );
      const data: NominatimResult[] = await res.json();
      if (data.length > 0) {
        setSelectedCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        setMapError(false);
      } else {
        setMapError(true);
      }
    } catch {
      setMapError(true);
    }
  }, [address, selectedCoords]);

  // OpenStreetMap embed URL
  const mapUrl = selectedCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${selectedCoords.lng - 0.003},${selectedCoords.lat - 0.002},${selectedCoords.lng + 0.003},${selectedCoords.lat + 0.002}&layer=mapnik&marker=${selectedCoords.lat},${selectedCoords.lng}`
    : null;

  return (
    <div className="space-y-3">
      {/* Input with autocomplete */}
      <div ref={wrapperRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
          <input
            type="text"
            value={address}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            onBlur={handleBlurGeocode}
            placeholder="Av. Santa Fe 1234, CABA"
            className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C07856] focus:border-transparent"
          />
          {loadingSuggestions && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999] animate-spin" />
          )}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {suggestions.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(result)}
                className="w-full px-4 py-3 text-left text-sm hover:bg-[#F5F5F0] border-b border-gray-50 last:border-b-0 flex items-start gap-2 transition-colors"
              >
                <MapPin className="w-4 h-4 text-[#C07856] shrink-0 mt-0.5" />
                <span className="text-[#2C2C2C] line-clamp-2">{result.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map preview */}
      {mapUrl && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <iframe
            src={mapUrl}
            width="100%"
            height="200"
            style={{ border: 0 }}
            loading="lazy"
            title="Ubicación de la propiedad"
            className="w-full"
          />
          <div className="bg-[#F5F5F0] px-3 py-1.5 border-t border-gray-100 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#C07856]" />
            <p className="text-xs text-[#5A5A5A]">Ubicación verificada</p>
          </div>
        </div>
      )}

      {/* No address yet placeholder */}
      {!mapUrl && !mapError && address.trim().length < 4 && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 h-[120px] flex items-center justify-center">
          <div className="text-center text-[#999]">
            <MapPin className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
            <p className="text-xs">Escribí la dirección para ver el mapa</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {mapError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 h-[80px] flex items-center justify-center">
          <div className="text-center text-amber-700">
            <AlertCircle className="w-5 h-5 mx-auto mb-1" />
            <p className="text-xs">No se encontró la dirección. Intentá ser más específico.</p>
          </div>
        </div>
      )}
    </div>
  );
}
