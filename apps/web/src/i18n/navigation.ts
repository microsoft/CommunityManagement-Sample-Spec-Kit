/**
 * Locale-aware navigation helpers.
 * Spec 014 — Task T007
 *
 * Wraps Next.js Link, redirect, usePathname, and useRouter
 * with locale-awareness via next-intl.
 */
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
