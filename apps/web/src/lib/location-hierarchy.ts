import type { LocationNode, CityWithContinent } from "@acroyoga/shared/types/explorer";
import type { EventSummary } from "@acroyoga/shared/types/events";

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
      const countryLat = countryCities.reduce((s, c) => s + c.latitude, 0) / countryCities.length;
      const countryLng = countryCities.reduce((s, c) => s + c.longitude, 0) / countryCities.length;

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

/** Recompute event counts on each node based on the current (filtered) events array. */
export function recomputeCounts(tree: LocationNode[], events: EventSummary[]): LocationNode[] {
  const cityCounts = new Map<string, number>();
  for (const e of events) {
    cityCounts.set(e.citySlug, (cityCounts.get(e.citySlug) ?? 0) + 1);
  }

  function update(node: LocationNode): LocationNode {
    if (node.type === "city") {
      return { ...node, eventCount: cityCounts.get(node.slug ?? "") ?? 0 };
    }
    const children = node.children.map(update);
    const count = children.reduce((sum, c) => sum + c.eventCount, 0);
    return { ...node, children, eventCount: count };
  }

  return tree.map(update);
}

/** Find a node by its id path (e.g. "EU/GB" or "EU/GB/london"). */
export function findNode(tree: LocationNode[], id: string): LocationNode | null {
  for (const node of tree) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return null;
}

/** Get the bounding box of a set of nodes with coordinates. */
export function getNodeBounds(nodes: LocationNode[]): [[number, number], [number, number]] | null {
  const coords = nodes.flatMap(function collect(n: LocationNode): { lat: number; lng: number }[] {
    if (n.latitude != null && n.longitude != null) return [{ lat: n.latitude, lng: n.longitude }];
    return n.children.flatMap(collect);
  });
  if (coords.length === 0) return null;
  const lats = coords.map((c) => c.lat);
  const lngs = coords.map((c) => c.lng);
  const pad = 1; // degree padding
  return [
    [Math.min(...lats) - pad, Math.min(...lngs) - pad],
    [Math.max(...lats) + pad, Math.max(...lngs) + pad],
  ];
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
