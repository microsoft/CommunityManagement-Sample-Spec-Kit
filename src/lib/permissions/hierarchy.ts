import { db } from "@/lib/db/client";
import type { Scope, ScopeType } from "@/types/permissions";

interface GeographyRow {
  city: string;
  country: string;
  continent: string;
}

const SCOPE_LEVEL: Record<ScopeType, number> = {
  city: 0,
  country: 1,
  continent: 2,
  global: 3,
};

/**
 * Determines if a grantScope encompasses a targetScope in the hierarchy.
 * Resolution: city → country → continent → global (walk up from target).
 */
export async function doesScopeEncompass(
  grantScope: Scope,
  targetScope: Scope,
): Promise<boolean> {
  // Global scope encompasses everything
  if (grantScope.scopeType === "global") return true;

  // A higher-level target cannot be encompassed by a lower-level grant
  if (SCOPE_LEVEL[grantScope.scopeType] < SCOPE_LEVEL[targetScope.scopeType]) return false;

  // Same scope type — direct value comparison
  if (grantScope.scopeType === targetScope.scopeType) {
    return grantScope.scopeValue === targetScope.scopeValue;
  }

  // Grant is higher scope than target — look up the target's geography
  if (targetScope.scopeType === "city" && targetScope.scopeValue) {
    const result = await db().query<GeographyRow>(
      "SELECT city, country, continent FROM geography WHERE city = $1",
      [targetScope.scopeValue],
    );
    if (result.rows.length === 0) return false;
    const geo = result.rows[0];

    if (grantScope.scopeType === "country") return grantScope.scopeValue === geo.country;
    if (grantScope.scopeType === "continent") return grantScope.scopeValue === geo.continent;
  }

  if (targetScope.scopeType === "country" && targetScope.scopeValue) {
    if (grantScope.scopeType === "continent") {
      // Look up any city in that country to get the continent
      const result = await db().query<GeographyRow>(
        "SELECT continent FROM geography WHERE country = $1 LIMIT 1",
        [targetScope.scopeValue],
      );
      if (result.rows.length === 0) return false;
      return grantScope.scopeValue === result.rows[0].continent;
    }
  }

  return false;
}

/**
 * Get the scope hierarchy ancestors for a given scope.
 * Returns scopes from most specific to most general.
 */
export async function getScopeAncestors(scope: Scope): Promise<Scope[]> {
  const ancestors: Scope[] = [scope];

  if (scope.scopeType === "city" && scope.scopeValue) {
    const result = await db().query<GeographyRow>(
      "SELECT country, continent FROM geography WHERE city = $1",
      [scope.scopeValue],
    );
    if (result.rows.length > 0) {
      const geo = result.rows[0];
      ancestors.push({ scopeType: "country", scopeValue: geo.country });
      ancestors.push({ scopeType: "continent", scopeValue: geo.continent });
    }
  } else if (scope.scopeType === "country" && scope.scopeValue) {
    const result = await db().query<GeographyRow>(
      "SELECT continent FROM geography WHERE country = $1 LIMIT 1",
      [scope.scopeValue],
    );
    if (result.rows.length > 0) {
      ancestors.push({ scopeType: "continent", scopeValue: result.rows[0].continent });
    }
  }

  ancestors.push({ scopeType: "global", scopeValue: null });
  return ancestors;
}
