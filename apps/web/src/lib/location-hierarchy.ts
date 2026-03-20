import type { City } from "@acroyoga/shared/types/cities";
import type { LocationNode, CityWithContinent } from "@acroyoga/shared/types/explorer";

const CONTINENT_NAMES: Record<string, string> = {
  AF: "Africa",
  AN: "Antarctica",
  AS: "Asia",
  EU: "Europe",
  NA: "North America",
  OC: "Oceania",
  SA: "South America",
  XX: "Global",
};

export function buildLocationTree(cities: CityWithContinent[]): LocationNode[] {
  const continentMap = new Map<string, Map<string, CityWithContinent[]>>();

  for (const city of cities) {
    const continentCode = city.continentCode ?? "XX";
    if (!continentMap.has(continentCode)) {
      continentMap.set(continentCode, new Map());
    }
    const countryMap = continentMap.get(continentCode)!;
    const countryCode = city.countryCode;
    if (!countryMap.has(countryCode)) {
      countryMap.set(countryCode, []);
    }
    countryMap.get(countryCode)!.push(city);
  }

  const tree: LocationNode[] = [];

  for (const [continentCode, countryMap] of continentMap) {
    const continentChildren: LocationNode[] = [];

    for (const [countryCode, countryCities] of countryMap) {
      const countryName = countryCities[0]?.countryName ?? countryCode;
      const cityNodes: LocationNode[] = countryCities
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((city) => ({
          id: `${continentCode}/${countryCode}/${city.slug}`,
          type: "city" as const,
          name: city.name,
          slug: city.slug,
          code: city.slug,
          eventCount: city.activeEventCount ?? 0,
          latitude: city.latitude,
          longitude: city.longitude,
          children: [],
        }));

      const countryEventCount = cityNodes.reduce((sum, c) => sum + c.eventCount, 0);
      const countryLat = countryCities[0]?.latitude ?? null;
      const countryLng = countryCities[0]?.longitude ?? null;

      continentChildren.push({
        id: `${continentCode}/${countryCode}`,
        type: "country",
        name: countryName,
        slug: null,
        code: countryCode,
        eventCount: countryEventCount,
        latitude: countryLat,
        longitude: countryLng,
        children: cityNodes,
      });
    }

    continentChildren.sort((a, b) => a.name.localeCompare(b.name));
    const continentEventCount = continentChildren.reduce((sum, c) => sum + c.eventCount, 0);
    const continentName = CONTINENT_NAMES[continentCode] ?? continentCode;

    tree.push({
      id: continentCode,
      type: "continent",
      name: continentName,
      slug: null,
      code: continentCode,
      eventCount: continentEventCount,
      latitude: null,
      longitude: null,
      children: continentChildren,
    });
  }

  return sortAlphabetically(tree);
}

export function computeEventCounts(node: LocationNode): number {
  if (node.children.length === 0) {
    return node.eventCount;
  }
  const childSum = node.children.reduce((sum, child) => sum + computeEventCounts(child), 0);
  return childSum;
}

export function filterTree(nodes: LocationNode[], searchTerm: string): LocationNode[] {
  if (!searchTerm.trim()) return nodes;
  const lower = searchTerm.toLowerCase();

  return nodes
    .map((node) => {
      if (node.name.toLowerCase().includes(lower)) {
        return node;
      }
      const filteredChildren = filterTree(node.children, searchTerm);
      if (filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    })
    .filter((n): n is LocationNode => n !== null);
}

export function sortAlphabetically(nodes: LocationNode[]): LocationNode[] {
  return [...nodes]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((node) => ({
      ...node,
      children: sortAlphabetically(node.children),
    }));
}
