"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MapPin, Search, CheckCircle } from "lucide-react";
import { TREATMENT_FOCUS_OPTIONS } from "@/lib/constants";

const POPULAR_COUNTRIES = [
  "United States",
  "United Kingdom",
  "Thailand",
  "Spain",
  "Switzerland",
  "Mexico",
  "Australia",
  "Canada",
  "Portugal",
  "Costa Rica",
];

export function HeroSearch() {
  const router = useRouter();
  const [country, setCountry] = useState("");
  const [treatment, setTreatment] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showTreatmentDropdown, setShowTreatmentDropdown] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);
  const treatmentRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setShowCountryDropdown(false);
      }
      if (treatmentRef.current && !treatmentRef.current.contains(e.target as Node)) {
        setShowTreatmentDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSearch() {
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    if (treatment) params.set("treatment_focus", treatment);
    router.push(`/centers?${params.toString()}`);
  }

  function selectCountry(c: string) {
    setCountry(c);
    setShowCountryDropdown(false);
  }

  function selectTreatment(t: string) {
    setTreatment(t);
    setShowTreatmentDropdown(false);
  }

  const filteredCountries = country
    ? POPULAR_COUNTRIES.filter((c) => c.toLowerCase().includes(country.toLowerCase()))
    : POPULAR_COUNTRIES;

  const filteredTreatments = treatment
    ? TREATMENT_FOCUS_OPTIONS.filter((t) => t.label.toLowerCase().includes(treatment.toLowerCase()))
    : TREATMENT_FOCUS_OPTIONS;

  return (
    <div>
      <div className="mt-8 md:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Country */}
        <div className="relative flex-1" ref={countryRef}>
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-ambient">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Country"
              value={country}
              onChange={(e) => { setCountry(e.target.value); setShowCountryDropdown(true); }}
              onFocus={() => setShowCountryDropdown(true)}
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
            />
          </div>
          {showCountryDropdown && filteredCountries.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-ambient-lg z-50 py-1 max-h-48 overflow-y-auto">
              <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">Popular Locations</p>
              {filteredCountries.map((c) => (
                <button
                  key={c}
                  onClick={() => selectCountry(c)}
                  className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-surface-container transition-colors duration-200"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Treatment Type */}
        <div className="relative flex-1" ref={treatmentRef}>
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-ambient">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Treatment Type"
              value={treatment ? TREATMENT_FOCUS_OPTIONS.find(t => t.value === treatment)?.label || treatment : ""}
              onChange={(e) => { setTreatment(e.target.value); setShowTreatmentDropdown(true); }}
              onFocus={() => setShowTreatmentDropdown(true)}
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
            />
          </div>
          {showTreatmentDropdown && filteredTreatments.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-ambient-lg z-50 py-1 max-h-48 overflow-y-auto">
              <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">Treatment Focus</p>
              {filteredTreatments.map((t) => (
                <button
                  key={t.value}
                  onClick={() => selectTreatment(t.value)}
                  className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-surface-container transition-colors duration-200"
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={handleSearch}
          className="rounded-xl px-6 h-12 gradient-primary text-white hover:opacity-90 transition-opacity duration-300"
        >
          Search
        </Button>
      </div>

      {/* Verified Badge */}
      <div className="mt-5 md:mt-6 inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm">
        <CheckCircle className="h-4 w-4 text-primary" />
        <span className="text-xs text-muted-foreground">Verified Centers</span>
      </div>
    </div>
  );
}
