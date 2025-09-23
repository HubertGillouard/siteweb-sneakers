// sneakers-frontend/src/api/index.js

// ---------------------------------------------------------------------------
// Base API (proxifiée par Nginx sur /api)
// ---------------------------------------------------------------------------
const API_BASE = "/api";

// ---------------------------------------------------------------------------
// Auth token (mémoire + localStorage)
// ---------------------------------------------------------------------------
let _token = null;

export function setAuthToken(t) {
  _token = t || null;
  if (t) localStorage.setItem("token", t);
  else localStorage.removeItem("token");
}

export function getAuthToken() {
  return _token || localStorage.getItem("token") || null;
}

export function bootAuthFromStorage() {
  const t = localStorage.getItem("token");
  if (t) _token = t;
  return _token;
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------
async function http(path, { method = "GET", headers = {}, body } = {}) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
  };
  const tok = getAuthToken();
  if (tok) opts.headers["Authorization"] = `Bearer ${tok}`;
  if (body !== undefined) {
    opts.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} — ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------
export function resolveImg(url) {
  if (!url) return `${API_BASE}/images/placeholder.jpg`;
  if (url.startsWith("/images/")) return `${API_BASE}${url}`;
  if (url.startsWith("/api/images/")) return url;
  return url; // lien absolu externe
}

// ---------------------------------------------------------------------------
// Produits
// ---------------------------------------------------------------------------
export const health = () => http("/health");
export const productCount = () => http("/_count");

export const getProducts = () => http("/products");
export const getProduct = (id) => http(`/products/${id}`);
export const searchProducts = (q) => http(`/products?q=${encodeURIComponent(q)}`);

export const createProduct = (p) =>
  http("/products", { method: "POST", body: p });

export const updateProduct = (id, p) =>
  http(`/products/${id}`, { method: "PUT", body: p });

export const deleteProduct = (id) =>
  http(`/products/${id}`, { method: "DELETE" });

// ---------------------------------------------------------------------------
// Stock (vendeur)
// Accepte plusieurs formes d'appel :
// - updateStock(id, { size, qty })
// - updateStock(id, { size, delta })
// - updateStock(id, size, qty)
// - updateStock(id, size, null, delta)
// Essaye PATCH /products/:id/stock, sinon fallback sur PUT /products/:id
// ---------------------------------------------------------------------------
export function updateStock(id, arg1, arg2, arg3) {
    // Normalisation des paramètres
    let payload;
    if (typeof arg1 === "object" && arg1 !== null) {
      // { size, qty } ou { size, delta }
      payload = { ...arg1 };
    } else {
      // (id, size, qty) ou (id, size, qty, delta)
      payload = { size: arg1 };
      if (typeof arg2 === "number") payload.qty = arg2;
      if (typeof arg3 === "number") payload.delta = arg3;
    }
    return _updateStockImpl(id, payload);
  }
  
  async function _updateStockImpl(id, { size, qty, delta } = {}) {
    // 1) Tentative PATCH dédié (route préférable si dispo côté API)
    try {
      return await http(`/products/${id}/stock`, {
        method: "PATCH",
        body: { size, qty, delta },
      });
    } catch (e) {
      // 2) Fallback : si la route n'existe pas (404/405), on met à jour le produit complet
      if (/\b(404|405)\b/.test(String(e.message))) {
        const p = await getProduct(id);
  
        // Cas tailles : p.sizes = [{ size: "42", stock: 3 }, ...]
        if (Array.isArray(p.sizes) && size != null) {
          const idx = p.sizes.findIndex((s) => String(s.size) === String(size));
          if (idx >= 0) {
            const current = Number(p.sizes[idx].stock || 0);
            p.sizes[idx].stock =
              delta != null ? current + Number(delta) : Number(qty ?? current);
          } else {
            // si la taille n'existe pas encore, on l'ajoute
            p.sizes.push({
              size,
              stock:
                delta != null
                  ? Number(delta)
                  : Number(qty ?? 0),
            });
          }
        } else {
          // Cas simple : p.stock (global)
          const current = Number(p.stock || 0);
          p.stock =
            delta != null ? current + Number(delta) : Number(qty ?? current);
        }
  
        return updateProduct(id, p);
      }
      throw e;
    }
  }
  
// ---------------------------------------------------------------------------
// Auth (API)
// ---------------------------------------------------------------------------
export async function login(email, password) {
  const data = await http("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (data?.token) setAuthToken(data.token);
  return data;
}

export const me = () => http("/auth/me");

/** Déconnexion côté front : on oublie juste le token */
export function logout() {
  setAuthToken(null);
  return Promise.resolve();
}

// alias compat si du code existant importe encore `logoutApi`
export const logoutApi = logout;

// ---------------------------------------------------------------------------
// Panier (localStorage côté front)
// ---------------------------------------------------------------------------
const CART_KEY = "cart:v1";

export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  return items;
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
  return [];
}

export function addToCart(item) {
  const items = getCart();
  const idx = items.findIndex(
    (i) => i.id === item.id && i.size === item.size
  );
  if (idx >= 0) {
    items[idx].qty = (items[idx].qty || 1) + (item.qty || 1);
  } else {
    items.push({ ...item, qty: item.qty ?? 1 });
  }
  return saveCart(items);
}

export function updateCartItem(id, size, patch) {
  const items = getCart();
  const it = items.find((i) => i.id === id && i.size === size);
  if (it) {
    if (patch.qty != null) it.qty = Math.max(1, Number(patch.qty) || 1);
    if (patch.size) it.size = patch.size;
  }
  return saveCart(items);
}

export function removeFromCart(id, size) {
  const items = getCart().filter((i) => !(i.id === id && i.size === size));
  return saveCart(items);
}

// ---------------------------------------------------------------------------
// RGPD / Cookies (localStorage côté front)
// ---------------------------------------------------------------------------
const CONSENT_KEY = "consent:v1";

/**
 * getConsent() -> retourne l'objet de consentement ou null s’il n’existe pas.
 * Exemple d’objet stocké :
 * { necessary: true, analytics: true|false, marketing: true|false, timestamp: 1699999999999 }
 */
export function getConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * setConsent(value) -> enregistre l’objet de consentement.
 * `value` peut être :
 *  - un booléen (true/false) -> appliqué à analytics/marketing
 *  - ou un objet complet { analytics, marketing, necessary, ... }
 */
export function setConsent(value) {
  let v;
  if (typeof value === "boolean") {
    v = {
      necessary: true,
      analytics: value,
      marketing: value,
      timestamp: Date.now(),
    };
  } else if (value && typeof value === "object") {
    v = { necessary: true, timestamp: Date.now(), ...value };
  } else {
    v = null;
  }
  if (v) localStorage.setItem(CONSENT_KEY, JSON.stringify(v));
  else localStorage.removeItem(CONSENT_KEY);
  return v;
}
