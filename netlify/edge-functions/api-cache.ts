/**
 * =============================================================================
 * API CACHE EDGE FUNCTION - PERFORMANCE OPTIMIZATION
 * =============================================================================
 *
 * BEGINNER EXPLANATION:
 * This edge function caches API responses to make the app faster.
 * Instead of querying the database every time, we store responses
 * for a short time and reuse them for identical requests.
 *
 * WHY EDGE CACHING?
 * - Serverless functions are slow to start (cold start ~100-500ms)
 * - Database queries add more delay (~50-200ms)
 * - Caching saves time by avoiding repeated work
 * - Edge location means cache is closer to users (faster delivery)
 *
 * WHAT GETS CACHED:
 * - GET requests to /api/* endpoints
 * - Only successful responses (status 200)
 * - Cache key includes user identity (different users see different data)
 *
 * CACHE CONFIGURATION:
 * - Default TTL: 30 seconds (configurable via EDGE_CACHE_TTL_DEFAULT)
 * - Per-endpoint TTL: Override default for specific paths (EDGE_CACHE_TTL_MAP)
 * - Allowlist: Only cache specified API paths (EDGE_CACHE_ALLOWLIST)
 * - Bypass roles: Administrators skip cache (always get fresh data)
 *
 * CACHE KEY STRATEGY:
 * - Includes URL and hashed Authorization header
 * - Ensures users only see their own cached data
 * - Prevents cache poisoning between users
 *
 * SECURITY CONSIDERATIONS:
 * - Uses timing-safe JWT verification (prevents timing attacks)
 * - Hashes auth tokens in cache keys (no sensitive data exposed)
 * - Administrators bypass cache (see real-time data)
 *
 * =============================================================================
 */

import type { Context } from "@netlify/edge-functions";

const DEFAULT_TTL_SECONDS = 30;
const CACHE_TTL_DEFAULT_ENV = "EDGE_CACHE_TTL_DEFAULT";
const CACHE_TTL_MAP_ENV = "EDGE_CACHE_TTL_MAP";
const CACHE_ALLOWLIST_ENV = "EDGE_CACHE_ALLOWLIST";
const CACHE_BYPASS_ROLES_ENV = "EDGE_CACHE_BYPASS_ROLES";
const JWT_SECRET_ENV = "JWT_SECRET";

const DEFAULT_ALLOWLIST = [
    "/api/pets",
    "/api/appointments",
    "/api/medical-records",
    "/api/vaccinations",
    "/api/medications",
    "/api/clinical-records",
    "/api/notifications",
    "/api/users",
];
const DEFAULT_BYPASS_ROLES = ["administrator"];

/**
 * sha256Hex - Create secure hash for cache keys
 *
 * WHY SHA-256?
 * - One-way hash prevents reconstructing original auth token
 * - Consistent output length (64 characters)
 * - Cryptographically secure (no collisions in practice)
 *
 * Used to hash Authorization headers in cache keys without exposing tokens.
 */
async function sha256Hex(input: string): Promise<string> {
    const data = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * buildCacheKey - Create unique cache key for request
 *
 * WHY CUSTOM CACHE KEY?
 * - Standard URL caching would serve wrong data to different users
 * - Include hashed auth token to separate user-specific responses
 * - Ensures cache isolation between authenticated users
 *
 * @param request - The incoming request
 * @returns Modified request with user-specific cache key
 */
async function buildCacheKey(request: Request): Promise<Request> {
    const url = new URL(request.url);
    const auth = request.headers.get("authorization") || "";

    if (auth) {
        // WHY HASH? Prevent auth token exposure in cache keys
        const authHash = await sha256Hex(auth);
        url.searchParams.set("__auth", authHash);
    }

    return new Request(url.toString(), { method: "GET" });
}

/**
 * parseCommaList - Parse environment variable into array
 *
 * WHY THIS HELPER?
 * - Environment variables are strings (e.g., "a,b,c")
 * - Need to split and clean for programmatic use
 * - Handles empty/null values gracefully
 */
function parseCommaList(raw: string | null): string[] {
    if (!raw) return [];
    return raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
}

/**
 * parseTtlMap - Parse TTL configuration string
 *
 * WHY COMPLEX PARSING?
 * - Environment variable format: "/api/pets=60,/api/users=30"
 * - Need to extract path prefixes and their TTL values
 * - Sort by path length (longest first) for proper matching
 *
 * @param raw - Environment variable string
 * @returns Array of {path, ttl} objects
 */
function parseTtlMap(raw: string | null): Array<{ path: string; ttl: number }> {
    if (!raw) return [];
    const entries = raw
        .split(",")
        .map((pair) => pair.trim())
        .filter(Boolean)
        .map((pair) => {
            const [path, ttlRaw] = pair.split("=").map((part) => part.trim());
            const ttl = Number.parseInt(ttlRaw || "", 10);
            return {
                path,
                ttl: Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_TTL_SECONDS,
            };
        })
        .filter((entry) => entry.path);

    // WHY SORT BY LENGTH DESC? Match most specific paths first
    // e.g., "/api/pets/details" before "/api/pets"
    return entries.sort((a, b) => b.path.length - a.path.length);
}

/**
 * isPathAllowed - Check if path should be cached
 *
 * WHY ALLOWLIST?
 * - Not all API endpoints should be cached
 * - POST/PUT/DELETE should never be cached
 * - Some GET endpoints may contain sensitive or volatile data
 *
 * @param pathname - Request path
 * @param allowlist - Array of allowed path prefixes
 * @returns true if path is allowed to be cached
 */
function isPathAllowed(pathname: string, allowlist: string[]): boolean {
    if (!allowlist.length) return false;
    return allowlist.some((prefix) => pathname.startsWith(prefix));
}

/**
 * getTtlForPath - Get cache TTL for specific path
 *
 * WHY PER-PATH TTL?
 * - Different data has different freshness requirements
 * - Pets list: Can be stale for 60 seconds
 * - Appointments: Should be fresh within 15 seconds
 *
 * @param pathname - Request path
 * @param ttlMap - Per-path TTL overrides
 * @param fallback - Default TTL if no override matches
 * @returns TTL in seconds for this path
 */
function getTtlForPath(pathname: string, ttlMap: Array<{ path: string; ttl: number }>, fallback: number): number {
    const match = ttlMap.find((entry) => pathname.startsWith(entry.path));
    return match ? match.ttl : fallback;
}

/**
 * base64UrlToBytes - Convert base64url to Uint8Array
 *
 * WHY CUSTOM CONVERSION?
 * - JWT tokens use base64url encoding (not standard base64)
 * - Need to handle URL-safe characters (- and _)
 * - Convert to bytes for cryptographic verification
 */
function base64UrlToBytes(input: string): Uint8Array {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * timingSafeEqual - Constant-time comparison
 *
 * WHY TIMING-SAFE?
 * - Prevents timing attacks on cryptographic comparisons
 * - Always takes same time regardless of input differences
 * - Critical for security when comparing secrets/hashes
 *
 * @param a - First byte array
 * @param b - Second byte array
 * @returns true if arrays are identical
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i += 1) {
        diff |= a[i] ^ b[i];
    }
    return diff === 0;
}

/**
 * verifyJwtHs256 - Verify JWT token using HS256
 *
 * WHY CUSTOM VERIFICATION?
 * - Edge function runs in Deno, limited JWT libraries
 * - Need to verify tokens for cache bypass decisions
 * - Must be secure (timing-safe, proper crypto)
 *
 * @param token - JWT token string
 * @param secret - JWT secret key
 * @returns Decoded payload or null if invalid
 */
async function verifyJwtHs256(token: string, secret: string): Promise<Record<string, unknown> | null> {
    try {
        const [headerB64, payloadB64, signatureB64] = token.split(".");
        if (!headerB64 || !payloadB64 || !signatureB64) return null;

        const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(headerB64)));
        // WHY HS256 CHECK? Only support HS256 algorithm for security
        if (header.alg !== "HS256") return null;

        const payloadJson = new TextDecoder().decode(base64UrlToBytes(payloadB64));
        const payload = JSON.parse(payloadJson) as Record<string, unknown>;

        const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
        const key = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );
        const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, data));
        const actual = base64UrlToBytes(signatureB64);

        if (!timingSafeEqual(actual, expected)) return null;

        // WHY EXP CHECK? Reject expired tokens
        if (typeof payload.exp === "number") {
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp < now) return null;
        }

        return payload;
    } catch {
        return null;
    }
}

/**
 * Main Edge Function Handler
 *
 * EXECUTION FLOW:
 * 1. Check if request should be cached (GET /api/*)
 * 2. Check allowlist (only cache permitted paths)
 * 3. Check bypass roles (admins skip cache)
 * 4. Generate cache key (includes user identity)
 * 5. Check for cached response
 * 6. If cache hit: return cached response
 * 7. If cache miss: fetch from origin, cache result, return response
 *
 * WHY EDGE FUNCTION?
 * - Runs at CDN edge (closer to users = faster)
 * - Can manipulate requests/responses before origin
 * - Better performance than caching in serverless functions
 */
export default async (request: Request, context: Context) => {
    const url = new URL(request.url);

    // WHY ONLY GET? Other methods modify data, shouldn't be cached
    if (request.method !== "GET" || !url.pathname.startsWith("/api/")) {
        return context.next();
    }

    // WHY BYPASS HEADER? Allow clients to force fresh data
    if (request.headers.get("x-cache-bypass") === "1") {
        return context.next();
    }

    const allowlistEnv = Deno.env.get(CACHE_ALLOWLIST_ENV);
    const allowlist = parseCommaList(allowlistEnv);
    const allowedPaths = allowlist.length ? allowlist : DEFAULT_ALLOWLIST;
    if (!isPathAllowed(url.pathname, allowedPaths)) {
        return context.next();
    }

    const bypassRolesEnv = Deno.env.get(CACHE_BYPASS_ROLES_ENV);
    const bypassRoles = parseCommaList(bypassRolesEnv);
    const bypassList = bypassRoles.length ? bypassRoles : DEFAULT_BYPASS_ROLES;
    const authHeader = request.headers.get("authorization") || "";
    if (authHeader.toLowerCase().startsWith("bearer ")) {
        const token = authHeader.slice("bearer ".length).trim();
        const secret = Deno.env.get(JWT_SECRET_ENV);
        if (secret) {
            const payload = await verifyJwtHs256(token, secret);
            const role = typeof payload?.userType === "string" ? payload.userType : "";
            // WHY BYPASS ADMINS? They need to see real-time data changes
            if (role && bypassList.includes(role)) {
                return context.next();
            }
        }
    }

    const ttlDefaultEnv = Deno.env.get(CACHE_TTL_DEFAULT_ENV);
    const ttlDefault = Number.parseInt(ttlDefaultEnv || "", 10);
    const fallbackTtl = Number.isFinite(ttlDefault) && ttlDefault > 0 ? ttlDefault : DEFAULT_TTL_SECONDS;
    const ttlMapEnv = Deno.env.get(CACHE_TTL_MAP_ENV);
    const ttlMap = parseTtlMap(ttlMapEnv);
    const maxAge = getTtlForPath(url.pathname, ttlMap, fallbackTtl);

    const cacheKey = await buildCacheKey(request);
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) {
        const hitResponse = new Response(cached.body, cached);
        hitResponse.headers.set("X-Edge-Cache", "HIT");
        return hitResponse;
    }

    const response = await context.next();
    // WHY ONLY CACHE 200? Errors shouldn't be cached
    if (!response || response.status !== 200) {
        return response;
    }

    const headers = new Headers(response.headers);
    // WHY PRIVATE CACHE? User-specific data, not publicly cacheable
    headers.set("Cache-Control", `private, s-maxage=${maxAge}, max-age=0`);
    // WHY VARY AUTH? Different auth headers should use different caches
    headers.set("Vary", "Authorization");
    headers.set("X-Edge-Cache", "MISS");

    const cachedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });

    // WHY WAITUNTIL? Cache storage shouldn't block response
    context.waitUntil(cache.put(cacheKey, cachedResponse.clone()));

    return cachedResponse;
};
