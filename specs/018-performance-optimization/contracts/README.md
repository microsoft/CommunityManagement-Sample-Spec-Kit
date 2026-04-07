# Contracts: Performance Optimization (Spec 018)

No new API contracts are introduced by Spec 018. All performance optimisations (database indexes, server-side caching, SSR conversion, skeleton loading, error boundaries) are **transparent to API consumers** — response shapes, endpoints, and authentication requirements are unchanged.

See [research.md](../research.md) §7 (Bundle Baseline → Contracts) for the full rationale.
