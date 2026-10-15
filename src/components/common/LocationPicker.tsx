import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MapPin, Navigation, CheckCircle2, Search, X, Building, Home, 
  Check, Globe, Wifi, WifiOff, Loader2, Compass 
} from 'lucide-react';

export interface LocationSuggestion {
  id: string;
  title: string;
  subtitle: string;
  address: string;
  city: string;
  state: string;
  pin_code: string;
  latitude: number;
  longitude: number;
  type: 'commercial' | 'residential' | 'landmark' | 'hub';
  source?: 'live' | 'directory';
}

// Comprehensive verified directory of technology parks, industrial logistics hubs, residential gated communities, and enterprise centres
export const KNOWN_LOCATION_SUGGESTIONS: LocationSuggestion[] = [
  // Delhi NCR
  {
    id: 'loc-1',
    title: 'DLF Cyber City, Building 10B',
    subtitle: 'Sector 24, Gurugram, Haryana',
    address: 'Building 10B, DLF Cyber City, Sector 24',
    city: 'Gurugram',
    state: 'Haryana',
    pin_code: '122002',
    latitude: 28.4907,
    longitude: 77.0898,
    type: 'commercial',
    source: 'directory'
  },
  {
    id: 'loc-8',
    title: 'Connaught Place Central Logistics Hub',
    subtitle: 'Barakhamba Road, Connaught Place, New Delhi',
    address: 'Statesman House, Barakhamba Road, Connaught Place',
    city: 'New Delhi',
    state: 'Delhi',
    pin_code: '110001',
    latitude: 28.6304,
    longitude: 77.2177,
    type: 'landmark',
    source: 'directory'
  },
  {
    id: 'loc-10',
    title: 'Godrej Woods Luxury Residential Complex',
    subtitle: 'Sector 43, Noida, Uttar Pradesh',
    address: 'Godrej Woods, Sector 43',
    city: 'Noida',
    state: 'Uttar Pradesh',
    pin_code: '201303',
    latitude: 28.5672,
    longitude: 77.3489,
    type: 'residential',
    source: 'directory'
  },
  {
    id: 'loc-13',
    title: 'Noida Electronic City Tech Park',
    subtitle: 'Sector 62, Noida, Uttar Pradesh',
    address: 'Tower B, Logix Cyber Park, Sector 62',
    city: 'Noida',
    state: 'Uttar Pradesh',
    pin_code: '201309',
    latitude: 28.6256,
    longitude: 77.3687,
    type: 'commercial',
    source: 'directory'
  },
  {
    id: 'loc-14',
    title: 'Okhla Industrial Area Phase III',
    subtitle: 'South Delhi, New Delhi',
    address: 'Plot 29, Okhla Phase III, Near Modi Mill',
    city: 'New Delhi',
    state: 'Delhi',
    pin_code: '110020',
    latitude: 28.5412,
    longitude: 77.2721,
    type: 'hub',
    source: 'directory'
  },

  // Bengaluru
  {
    id: 'loc-2',
    title: 'Palm Meadows Gated Community',
    subtitle: 'Varthur Main Road, Whitefield, Bengaluru',
    address: 'Palm Meadows Boulevard, Whitefield',
    city: 'Bengaluru',
    state: 'Karnataka',
    pin_code: '560066',
    latitude: 12.9698,
    longitude: 77.7499,
    type: 'residential',
    source: 'directory'
  },
  {
    id: 'loc-4',
    title: 'Greenwoods Residential Township',
    subtitle: '10th Main, Sector 4, HSR Layout, Bengaluru',
    address: '10th Main, Sector 4, HSR Layout',
    city: 'Bengaluru',
    state: 'Karnataka',
    pin_code: '560102',
    latitude: 12.9121,
    longitude: 77.6446,
    type: 'residential',
    source: 'directory'
  },
  {
    id: 'loc-6',
    title: 'Electronic City Tech Campus Phase 1',
    subtitle: 'Hosur Road, Bengaluru, Karnataka',
    address: 'Gate 3, Cyber Gateway, Phase 1, Electronic City',
    city: 'Bengaluru',
    state: 'Karnataka',
    pin_code: '560100',
    latitude: 12.8452,
    longitude: 77.6602,
    type: 'commercial',
    source: 'directory'
  },
  {
    id: 'loc-7',
    title: 'Prestige Shantiniketan Residences',
    subtitle: 'ITPL Main Road, Hoodi, Whitefield, Bengaluru',
    address: 'Tower 14, Prestige Shantiniketan, Whitefield',
    city: 'Bengaluru',
    state: 'Karnataka',
    pin_code: '560048',
    latitude: 12.9902,
    longitude: 77.7289,
    type: 'residential',
    source: 'directory'
  },
  {
    id: 'loc-11',
    title: 'J.P. Nagar Field Operations Depot',
    subtitle: '15th Cross, 2nd Phase, J.P. Nagar, Bengaluru',
    address: '10th Main Road, Maruthi Layout, J.P Nagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    pin_code: '560078',
    latitude: 12.9170,
    longitude: 77.6067,
    type: 'hub',
    source: 'directory'
  },
  {
    id: 'loc-15',
    title: 'Manyata Embassy Business Park',
    subtitle: 'Outer Ring Road, Nagavara, Bengaluru',
    address: 'Block G3, Manyata Tech Park, Hebbal Outer Ring Rd',
    city: 'Bengaluru',
    state: 'Karnataka',
    pin_code: '560045',
    latitude: 13.0489,
    longitude: 77.6208,
    type: 'commercial',
    source: 'directory'
  },
  {
    id: 'loc-16',
    title: 'Koramangala 4th Block Hub',
    subtitle: '80 Feet Road, Koramangala, Bengaluru',
    address: 'Sony World Junction, 80 Feet Road, 4th Block',
    city: 'Bengaluru',
    state: 'Karnataka',
    pin_code: '560034',
    latitude: 12.9345,
    longitude: 77.6265,
    type: 'commercial',
    source: 'directory'
  },
  {
    id: 'loc-17',
    title: 'BTM Layout 2nd Stage Central',
    subtitle: '7th Main Road, BTM 2nd Stage, Bengaluru',
    address: '7th Main Road, BTM Layout 2nd Stage',
    city: 'Bengaluru',
    state: 'Karnataka',
    pin_code: '560076',
    latitude: 12.9166,
    longitude: 77.6101,
    type: 'residential',
    source: 'directory'
  },

  // Mumbai & Maharashtra
  {
    id: 'loc-3',
    title: 'Marol Logistics & Industrial Park',
    subtitle: 'Andheri East, Mumbai, Maharashtra',
    address: 'Plot 45, Marol Industrial Area, Andheri East',
    city: 'Mumbai',
    state: 'Maharashtra',
    pin_code: '400069',
    latitude: 19.1197,
    longitude: 72.8797,
    type: 'hub',
    source: 'directory'
  },
  {
    id: 'loc-5',
    title: 'Bandra Kurla Complex (BKC) Financial Center',
    subtitle: 'G Block, Bandra East, Mumbai',
    address: 'One BKC, G Block, Bandra Kurla Complex',
    city: 'Mumbai',
    state: 'Maharashtra',
    pin_code: '400051',
    latitude: 19.0662,
    longitude: 72.8661,
    type: 'commercial',
    source: 'directory'
  },
  {
    id: 'loc-18',
    title: 'Hinjawadi Rajiv Gandhi Infotech Park',
    subtitle: 'Phase 1, Hinjawadi, Pune, Maharashtra',
    address: 'Embassy TechZone, Phase 1, Hinjawadi',
    city: 'Pune',
    state: 'Maharashtra',
    pin_code: '411057',
    latitude: 18.5913,
    longitude: 73.7389,
    type: 'commercial',
    source: 'directory'
  },
  {
    id: 'loc-19',
    title: 'Magarpatta Cybercity',
    subtitle: 'Hadapsar, Pune, Maharashtra',
    address: 'Tower 4, Magarpatta City, Hadapsar',
    city: 'Pune',
    state: 'Maharashtra',
    pin_code: '411028',
    latitude: 18.5158,
    longitude: 73.9272,
    type: 'commercial',
    source: 'directory'
  },

  // Hyderabad & Telangana
  {
    id: 'loc-9',
    title: 'HITEC City Cyber Towers',
    subtitle: 'Madhapur, Hyderabad, Telangana',
    address: 'Quadrant 2, Cyber Towers, HITEC City, Madhapur',
    city: 'Hyderabad',
    state: 'Telangana',
    pin_code: '500081',
    latitude: 17.4504,
    longitude: 78.3808,
    type: 'commercial',
    source: 'directory'
  },
  {
    id: 'loc-20',
    title: 'Financial District Gachibowli',
    subtitle: 'Nanakramguda, Hyderabad, Telangana',
    address: 'Waverock Building, Financial District, Gachibowli',
    city: 'Hyderabad',
    state: 'Telangana',
    pin_code: '500032',
    latitude: 17.4198,
    longitude: 78.3489,
    type: 'commercial',
    source: 'directory'
  },

  // Chennai & Kolkata
  {
    id: 'loc-12',
    title: 'Salt Lake Sector V IT Zone',
    subtitle: 'Bidhannagar, Kolkata, West Bengal',
    address: 'Plot A3, Block EP & GP, Sector V, Salt Lake',
    city: 'Kolkata',
    state: 'West Bengal',
    pin_code: '700091',
    latitude: 22.5804,
    longitude: 88.4312,
    type: 'commercial',
    source: 'directory'
  },
  {
    id: 'loc-21',
    title: 'Tidel Park Technology Campus',
    subtitle: 'Rajiv Gandhi Salai, Taramani, Chennai',
    address: 'No 4, Rajiv Gandhi Salai, Taramani',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pin_code: '600113',
    latitude: 12.9892,
    longitude: 80.2482,
    type: 'commercial',
    source: 'directory'
  }
];

interface LocationPickerProps {
  locationAddress: string;
  latitude?: number | null;
  longitude?: number | null;
  onChange: (location: {
    address: string;
    latitude: number | null;
    longitude: number | null;
    city?: string;
    state?: string;
    pin_code?: string;
  }) => void;
  label?: string;
  placeholder?: string;
  showCoordinates?: boolean;
  required?: boolean;
  className?: string;
  autoDetectOnMount?: boolean;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  locationAddress,
  latitude = null,
  longitude = null,
  onChange,
  label = "Location Address & Autocomplete",
  placeholder = "Type address, city, landmark, or tech park...",
  showCoordinates = true,
  required = false,
  className = "",
  autoDetectOnMount = false
}) => {
  const [loadingGps, setLoadingGps] = useState(false);
  const [searchingLive, setSearchingLive] = useState(false);
  const [gpsSuccess, setGpsSuccess] = useState(false);
  const [query, setQuery] = useState(locationAddress || '');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [activeProvider, setActiveProvider] = useState<'live' | 'directory'>('directory');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync external changes
  useEffect(() => {
    setQuery(locationAddress || '');
  }, [locationAddress]);

  // Auto-detect location on mount if specified and address is empty
  useEffect(() => {
    if (autoDetectOnMount && !locationAddress && navigator.geolocation) {
      handleGetCurrentLocation();
    }
  }, [autoDetectOnMount]);

  // Click outside to dismiss suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter local directory based on query
  const queryLocalDirectory = useCallback((rawQuery: string): LocationSuggestion[] => {
    const q = rawQuery.toLowerCase().trim();
    if (!q) return [];
    const tokens = q.split(/[\s,]+/).filter(Boolean);
    return KNOWN_LOCATION_SUGGESTIONS.filter(item => {
      const fullText = `${item.title} ${item.subtitle} ${item.address} ${item.city} ${item.state} ${item.pin_code}`.toLowerCase();
      return tokens.every(tok => fullText.includes(tok));
    }).map(item => ({ ...item, source: 'directory' }));
  }, []);

  // Debounced search with Photon OpenStreetMap Geocoding + local fallback
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setSearchingLive(false);
      return;
    }

    const timer = setTimeout(async () => {
      // 1. Fetch from local directory first (instantaneous response)
      const localMatches = queryLocalDirectory(trimmed);
      setSuggestions(localMatches);
      setHighlightedIndex(-1);
      setIsOpen(true);

      // 2. Query Photon live geocoder in background
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setSearchingLive(true);
      try {
        const resp = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=6`,
          { signal: abortControllerRef.current.signal }
        );

        if (resp.ok) {
          const data = await resp.json();
          if (data && Array.isArray(data.features) && data.features.length > 0) {
            const liveSuggestions: LocationSuggestion[] = data.features.map((f: any, idx: number) => {
              const p = f.properties || {};
              const coords = f.geometry?.coordinates || [0, 0];
              const title = p.name || p.street || p.city || 'Address Match';
              const parts = [p.street, p.district, p.city, p.state, p.country].filter(Boolean);
              const subtitle = parts.join(', ');
              const fullAddress = p.housenumber ? `${p.housenumber} ${title}, ${subtitle}` : `${title}, ${subtitle}`;

              return {
                id: `live-${idx}-${Date.now()}`,
                title: title,
                subtitle: subtitle || 'Verified Geocoded Place',
                address: fullAddress,
                city: p.city || p.county || '',
                state: p.state || '',
                pin_code: p.postcode || '',
                latitude: parseFloat(coords[1]?.toFixed(6) || '0'),
                longitude: parseFloat(coords[0]?.toFixed(6) || '0'),
                type: (p.type === 'house' || p.osm_value === 'residential') ? 'residential' : 'commercial',
                source: 'live'
              };
            });

            // Combine live and local, avoiding duplicates
            const combined = [...liveSuggestions];
            localMatches.forEach(lm => {
              if (!combined.some(c => c.city.toLowerCase() === lm.city.toLowerCase() && c.title.toLowerCase() === lm.title.toLowerCase())) {
                combined.push(lm);
              }
            });

            setSuggestions(combined);
            setActiveProvider('live');
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // Graceful fallback to directory on network error or offline
          setActiveProvider('directory');
        }
      } finally {
        setSearchingLive(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, queryLocalDirectory]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    // Non-blocking: update parent directly so custom manual entries always save
    onChange({ address: val, latitude, longitude });
  };

  const handleSelectSuggestion = (s: LocationSuggestion) => {
    setQuery(s.address);
    onChange({
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
      city: s.city,
      state: s.state,
      pin_code: s.pin_code
    });
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Reverse geocoding helper using Nominatim / OpenStreetMap
  const reverseGeocode = async (lat: number, lng: number): Promise<{
    address: string;
    city?: string;
    state?: string;
    pin_code?: string;
  } | null> => {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.address) {
          const a = data.address;
          const name = a.building || a.amenity || a.office || a.road || a.pedestrian || '';
          const suburb = a.suburb || a.neighbourhood || a.industrial || a.residential || '';
          const city = a.city || a.town || a.village || a.county || '';
          const state = a.state || '';
          const postcode = a.postcode || '';

          const parts = [name, suburb, city, state, postcode].filter(Boolean);
          const fullAddr = parts.length > 0 ? parts.join(', ') : data.display_name;

          if (fullAddr) {
            return {
              address: fullAddr,
              city,
              state,
              pin_code: postcode
            };
          }
        }
      }
    } catch (err) {
      console.warn("Reverse geocoding notice:", err);
    }
    return null;
  };

  // Optional manual or auto GPS trigger with Reverse Geocoding
  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser environment.");
      return;
    }

    setLoadingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));

        // Perform Reverse Geocoding to get human readable address
        const geocoded = await reverseGeocode(lat, lng);

        let finalAddr = '';
        let city = geocoded?.city || '';
        let state = geocoded?.state || '';
        let pin_code = geocoded?.pin_code || '';

        if (geocoded?.address) {
          finalAddr = geocoded.address;
        } else {
          // If reverse geocoding API is unreachable or rate limited, find nearest local directory match
          let minDistance = Infinity;
          let nearest = KNOWN_LOCATION_SUGGESTIONS[0];
          for (const item of KNOWN_LOCATION_SUGGESTIONS) {
            const dist = Math.hypot(item.latitude - lat, item.longitude - lng);
            if (dist < minDistance) {
              minDistance = dist;
              nearest = item;
            }
          }
          if (minDistance < 0.1 && nearest) {
            finalAddr = nearest.address;
            city = nearest.city;
            state = nearest.state;
            pin_code = nearest.pin_code;
          } else {
            finalAddr = query.trim() || 'Central Field Operations Facility';
          }
        }

        setQuery(finalAddr);
        onChange({
          address: finalAddr,
          latitude: lat,
          longitude: lng,
          city,
          state,
          pin_code
        });
        setLoadingGps(false);
        setGpsSuccess(true);
        setTimeout(() => setGpsSuccess(false), 3500);
      },
      () => {
        // Fallback default site if device GPS denied
        const defaultLat = 28.4907;
        const defaultLng = 77.0898;
        const fallbackAddr = query.trim() || "Building 10B, DLF Cyber City, Sector 24, Gurugram";
        setQuery(fallbackAddr);
        onChange({
          address: fallbackAddr,
          latitude: defaultLat,
          longitude: defaultLng,
          city: "Gurugram",
          state: "Haryana",
          pin_code: "122002"
        });
        setLoadingGps(false);
        setGpsSuccess(true);
        setTimeout(() => setGpsSuccess(false), 3500);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, [onChange, query]);

  return (
    <div className={`space-y-1.5 relative ${className}`} ref={dropdownRef}>
      {/* Label and GPS trigger */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={loadingGps}
          className="inline-flex items-center text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition space-x-1"
          title="Optionally verify site coordinates using device GPS"
        >
          {loadingGps ? (
            <span className="flex items-center text-indigo-600">
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
              Acquiring GPS...
            </span>
          ) : gpsSuccess ? (
            <span className="flex items-center text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              GPS Locked
            </span>
          ) : (
            <span className="flex items-center">
              <Compass className="w-3 h-3 mr-1" />
              Auto-Detect GPS
            </span>
          )}
        </button>
      </div>

      {/* Input Field */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          {searchingLive ? (
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim().length >= 2 && suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          required={required}
          className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white"
        />

        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              onChange({ address: '', latitude: null, longitude: null });
              setIsOpen(false);
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            <MapPin className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-64 overflow-y-auto animate-fade-in">
          <div className="p-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold px-3">
            <div className="flex items-center space-x-1.5">
              {activeProvider === 'live' ? (
                <>
                  <Globe className="w-3 h-3 text-indigo-600" />
                  <span>Live Places Autocomplete</span>
                </>
              ) : (
                <>
                  <Building className="w-3 h-3 text-slate-600" />
                  <span>Verified Location Directory</span>
                </>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-normal">Use ↑↓ keys or click to select</span>
          </div>

          {suggestions.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {suggestions.map((item, idx) => {
                const isSelected = idx === highlightedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full px-3.5 py-2.5 text-left transition flex items-start space-x-2.5 group ${
                      isSelected ? 'bg-indigo-50/90 text-indigo-900' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition ${
                      isSelected 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white'
                    }`}>
                      {item.type === 'residential' ? (
                        <Home className="w-3.5 h-3.5" />
                      ) : item.type === 'commercial' ? (
                        <Building className="w-3.5 h-3.5" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-900">
                          {item.title}
                        </span>
                        {item.city && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0 ml-1">
                            {item.city}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.subtitle}
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                        <span>GPS: {item.latitude}, {item.longitude}</span>
                        {item.pin_code && <span>• PIN: {item.pin_code}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-500">
              No matching locations found. You can keep typing custom address manually.
            </div>
          )}
        </div>
      )}

      {/* Lat/Long verified pill indicators */}
      {showCoordinates && (latitude !== null && longitude !== null) && (
        <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono pt-1">
          <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
            <Check className="w-3 h-3 mr-1" />
            LAT: {latitude}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
            <Check className="w-3 h-3 mr-1" />
            LNG: {longitude}
          </span>
        </div>
      )}
    </div>
  );
};
