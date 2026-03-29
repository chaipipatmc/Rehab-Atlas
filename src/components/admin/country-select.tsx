"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface CountrySelectProps {
  countries: string[];
  currentValue: string;
}

export function CountrySelect({ countries, currentValue }: CountrySelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const p = new URLSearchParams(searchParams.toString());
    const value = e.target.value;
    if (value === "all") {
      p.delete("country");
    } else {
      p.set("country", value);
    }
    p.delete("page");
    const qs = p.toString();
    router.push(`/admin/centers${qs ? `?${qs}` : ""}`);
  }

  return (
    <select
      value={currentValue}
      onChange={handleChange}
      className="h-8 rounded-full border border-input bg-surface-container-lowest px-3 pr-8 text-xs focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
    >
      <option value="all">All Countries</option>
      {countries.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
}
