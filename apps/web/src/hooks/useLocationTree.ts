"use client";

import { useState, useEffect, useMemo } from "react";
import type { LocationNode, CityWithContinent } from "@acroyoga/shared/types/explorer";
import { buildLocationTree, filterTree } from "@/lib/location-hierarchy";

interface UseLocationTreeResult {
  tree: LocationNode[];
  filteredTree: LocationNode[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export function useLocationTree(): UseLocationTreeResult {
  const [cities, setCities] = useState<CityWithContinent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchCities = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/cities?activeOnly=true");
        if (!res.ok) throw new Error("Failed to load cities");
        const data = await res.json();
        setCities(data.cities ?? data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchCities();
  }, []);

  const tree = useMemo(() => buildLocationTree(cities), [cities]);

  const filteredTree = useMemo(
    () => filterTree(tree, searchTerm),
    [tree, searchTerm]
  );

  return { tree, filteredTree, loading, error, searchTerm, setSearchTerm };
}
