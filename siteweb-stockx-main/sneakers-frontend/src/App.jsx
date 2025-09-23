import React, { useEffect, useMemo, useState, useCallback } from "react";

/* -------------------------------------------------------
   CONFIG
--------------------------------------------------------*/
const API = ""; // même origine via Nginx: /api/...
const USE_UNSPLASH_FALLBACK = true; // mets false pour désactiver les images externes

/* -------------------------------------------------------
   FETCH HELPERS
--------------------------------------------------------*/
async function jget(url) {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
  return r.json();
}
async function jpost(url, body, token) {
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
    credentials: "include",
  });
  if (!r.ok) throw new Error(`POST ${url} -> ${r.status}`);
  return r.json();
}
async function jput(url, body, token) {
  const r = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
    credentials: "include",
  });
  if (!r.ok) throw new Error(`PUT ${url} -> ${r.status}`);
  return r.json();
}
async function jdel(url, token) {
  const r = await fetch(url, {
    method: "DELETE",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
  if (!r.ok) throw new Error(`DELETE ${url} -> ${r.status}`);
  return r.json().catch(() => ({}));
}

/* -------------------------------------------------------
   UTILITAIRES FRONT
--------------------------------------------------------*/
function brandFromName(name = "") {
  const n = name.toLowerCase();
  if (n.includes("nike")) return "nike";
  if (n.includes("adidas")) return "adidas";
  if (n.includes("puma")) return "puma";
  if (n.includes("new balance")) return "new balance";
  if (n.includes("asics")) return "asics";
  if (n.includes("converse")) return "converse";
  if (n.includes("reebok")) return "reebok";
  return "sneakers";
}
function resolveImg(src, name) {
  if (src && src.startsWith("/images/")) return "/api" + src;
  if (src && /^https?:/.test(src)) return src;
  if (src === "/api/images/placeholder.jpg" || src === "/images/placeholder.jpg" || !src) {
    if (USE_UNSPLASH_FALLBACK) {
      const kw = encodeURIComponent(`${brandFromName(name)},sneakers,shoes`);
      return `https://source.unsplash.com/600x420/?${kw}`;
    }
    return "/api/images/placeholder.jpg";
  }
  return src;
}
function formatPrice(v, currency = "EUR", locale = "fr-FR") {
  const n = Number(v ?? 0);
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}
// Prix de démo si l’API n’en donne pas
function derivePrice(p) {
  return 69 + ((p?.id ?? 1) % 81);
}
// tailles par défaut si l’API ne donne pas
function defaultSizes(p) {
  const base = ["40", "41", "42", "43", "44", "45"];
  const tweak = (p?.id ?? 0) % 2 ? ["39", "46"] : ["40.5", "44.5"];
  return [...new Set([...base, ...tweak])];
}

/* -------------------------------------------------------
   AUTH (démo + fallback)
--------------------------------------------------------*/
const AUTH_KEY = "auth.v1";
function readAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
  } catch {
    return null;
  }
}
function writeAuth(val) {
  if (!val) localStorage.removeItem(AUTH_KEY);
  else localStorage.setItem(AUTH_KEY, JSON.stringify(val));
}
async function loginAPI(email, password) {
  try {
    const res = await jpost(`${API}/api/auth/login`, { email, password });
    if (!res?.token) throw new Error("Réponse login invalide");
    const role =
      res.role ||
      (email.startsWith("admin")
        ? "admin"
        : email.startsWith("seller")
        ? "seller"
        : "client");
    const auth = { token: res.token, email, role };
    writeAuth(auth);
    return auth;
  } catch {
    if (email === "admin@test.com" && password === "admin")
      return writeAuth({ token: "demo-admin", email, role: "admin" }), readAuth();
    if (email === "seller@test.com" && password === "seller")
      return writeAuth({ token: "demo-seller", email, role: "seller" }), readAuth();
    if (email === "client@test.com" && password === "client")
      return writeAuth({ token: "demo-client", email, role: "client" }), readAuth();
    if (email === "user@test.com" && password === "user")
      return writeAuth({ token: "demo-client", email, role: "client" }), readAuth();
    throw new Error("Identifiants invalides");
  }
}
async function logoutAPI() {
  writeAuth(null);
}
function hasRole(user, roles) {
  return !!user && roles.includes(user.role);
}

/* -------------------------------------------------------
   PANIER & COMMANDES (LocalStorage fallback)
--------------------------------------------------------*/
const CART_KEY = "cart.v1";
const ORDERS_KEY = "orders.v1";
const cookieKey = "cookies.consent";

function readCartLS() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeCartLS(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}
function readOrdersLS() {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeOrdersLS(orders) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}
function pushOrderLS(order) {
  const all = readOrdersLS();
  writeOrdersLS([order, ...all]);
}

/* Timeline util */
const STATUS_FLOW = ["créée", "payée", "préparée", "expédiée", "livrée"];
function nextStatus(s) {
  const i = STATUS_FLOW.indexOf(s);
  return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : s;
}

/* -------------------------------------------------------
   ROUTER HASH
--------------------------------------------------------*/
function parseHash(h) {
  const clean = (h || "#/").replace(/^#/, "");
  const parts = clean.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "home", params: {} };
  if (parts[0] === "product" && parts[1]) return { name: "product", params: { id: parts[1] } };
  if (parts[0] === "cart") return { name: "cart", params: {} };
  if (parts[0] === "checkout") return { name: "checkout", params: {} };
  if (parts[0] === "login") return { name: "login", params: {} };
  if (parts[0] === "privacy") return { name: "privacy", params: {} };
  if (parts[0] === "admin") return { name: "admin", params: {} };
  if (parts[0] === "seller") return { name: "seller", params: {} };
  if (parts[0] === "orders") return { name: "orders", params: {} };
  if (parts[0] === "orders-manage") return { name: "ordersManage", params: {} };
  if (parts[0] === "order" && parts[1]) return { name: "order", params: { id: parts[1] } };
  return { name: "home", params: {} };
}
function goto(h) {
  window.location.hash = h;
}

/* -------------------------------------------------------
   UI GÉNÉRIQUE
--------------------------------------------------------*/
function Badge({ children }) {
  return <span className="badge">{children}</span>;
}
function Button({ children, kind = "primary", ...rest }) {
  return (
    <button className={`btn ${kind}`} {...rest}>
      {children}
    </button>
  );
}
function Chip({ active, children, ...rest }) {
  return (
    <button className={`chip ${active ? "active" : ""}`} {...rest}>
      {children}
    </button>
  );
}
function Toast({ msg, onClose }) {
  if (!msg) return null;
  return (
    <div className="toast" onClick={onClose} role="status" aria-live="polite">
      {msg}
    </div>
  );
}
function CookieBanner() {
  const [consent, setConsent] = useState(() => localStorage.getItem(cookieKey));
  if (consent) return null;
  return (
    <div className="cookie">
      <div>
        <strong>Cookies & RGPD</strong>
        <p>
          Nous utilisons des cookies nécessaires au fonctionnement. Consulte la{" "}
          <a href="#/privacy">politique de confidentialité</a>.
        </p>
      </div>
      <div className="cookie-actions">
        <Button onClick={() => (localStorage.setItem(cookieKey, "accepted"), setConsent("accepted"))}>
          Accepter
        </Button>
        <Button kind="ghost" onClick={() => (localStorage.setItem(cookieKey, "declined"), setConsent("declined"))}>
          Refuser
        </Button>
      </div>
    </div>
  );
}
function Guard({ user, roles, children }) {
  if (!user) return <p>Connecte-toi pour accéder à cette page. <a className="link" href="#/login">Se connecter</a></p>;
  if (!hasRole(user, roles)) return <p>Accès refusé (rôle requis : {roles.join(" ou ")}).</p>;
  return children;
}

/* -------------------------------------------------------
   APP
--------------------------------------------------------*/
export default function App() {
  // Router
  const [hash, setHash] = useState(() => window.location.hash || "#/");
  useEffect(() => {
    const h = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  const route = parseHash(hash);

  // Auth
  const [user, setUser] = useState(() => readAuth());

  // Catalogue
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState("all");
  const [q, setQ] = useState("");

  // Panier
  const [cart, setCart] = useState(() => readCartLS());
  const [toast, setToast] = useState("");

  // Commandes (pour vue manage live refresh)
  const [ordersVersion, setOrdersVersion] = useState(0);

  // Data load
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const list = await jget(`${API}/api/products`);
        setAllProducts(Array.isArray(list) ? list : []);
      } catch {
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    writeCartLS(cart);
  }, [cart]);

  // Filtres
  const brands = useMemo(() => {
    const s = new Set();
    allProducts.forEach((p) => s.add(capitalize(brandFromName(p.name))));
    return ["all", ...Array.from(s)];
  }, [allProducts]);
  const products = useMemo(() => {
    let list = allProducts;
    if (brand !== "all") {
      list = list.filter((p) => capitalize(brandFromName(p.name)) === brand);
    }
    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      list = list.filter((p) => (p.name || "").toLowerCase().includes(qq));
    }
    return list;
  }, [allProducts, brand, q]);

  // Total panier
  const total = useMemo(() => {
    return cart.reduce((s, it) => {
      const p = allProducts.find((x) => x.id === it.id);
      const price = p?.price ?? derivePrice(p);
      return s + price * it.qty;
    }, 0);
  }, [cart, allProducts]);

  // Actions panier
  function addToCart(p, size, qty = 1) {
    setCart((prev) => {
      const i = prev.findIndex((x) => x.id === p.id && x.size === size);
      const next = [...prev];
      if (i >= 0) next[i] = { ...next[i], qty: next[i].qty + qty };
      else next.push({ id: p.id, size, qty });
      return next;
    });
    setToast(`Ajouté : ${p.name} (${size})`);
  }
  function setQty(it, qv) {
    const qty = Math.max(1, Number(qv || 1));
    setCart((prev) =>
      prev.map((x) => (x.id === it.id && x.size === it.size ? { ...x, qty } : x))
    );
  }
  function removeLine(it) {
    setCart((prev) => prev.filter((x) => !(x.id === it.id && x.size === it.size)));
  }
  function clearCart() {
    setCart([]);
  }

  // Checkout + timeline
  async function doCheckout(customer) {
    try {
      const auth = readAuth();
      const res = await jpost(`${API}/api/checkout`, { items: cart, customer }, auth?.token);
      const id = res?.orderId || res?.id || ("DEMO-" + Math.random().toString(36).slice(2, 8).toUpperCase());
      const now = new Date().toISOString();
      pushOrderLS({
        id,
        date: now,
        items: cart,
        customer,
        total,
        status: "payée",
        timeline: [
          { code: "créée", label: "Commande créée", at: now },
          { code: "payée", label: "Paiement accepté", at: now },
        ],
      });
      setToast(`Commande ${id} confirmée`);
      clearCart();
      setOrdersVersion((v) => v + 1);
      goto(`#/order/${id}`);
    } catch {
      const id = "DEMO-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      const now = new Date().toISOString();
      pushOrderLS({
        id,
        date: now,
        items: cart,
        customer,
        total,
        status: "payée",
        timeline: [
          { code: "créée", label: "Commande créée", at: now },
          { code: "payée", label: "Paiement accepté", at: now },
        ],
      });
      setToast(`Commande ${id} confirmée (fictif)`);
      clearCart();
      setOrdersVersion((v) => v + 1);
      goto(`#/order/${id}`);
    }
  }

  // Admin CRUD (fallback mock si API absente)
  const createProduct = useCallback(
    async (payload) => {
      try {
        const auth = readAuth();
        const created = await jpost(`/api/admin/products`, payload, auth?.token);
        setAllProducts((prev) => [created, ...prev]);
        setToast("Produit créé");
      } catch {
        const id = Math.max(0, ...allProducts.map((p) => p.id || 0)) + 1;
        const created = { id, ...payload };
        setAllProducts((prev) => [created, ...prev]);
        setToast("Produit créé (mock)");
      }
    },
    [allProducts]
  );
  const updateProduct = useCallback(async (id, payload) => {
    try {
      const auth = readAuth();
      const updated = await jput(`/api/admin/products/${id}`, payload, auth?.token);
      setAllProducts((prev) => prev.map((p) => (String(p.id) === String(id) ? updated : p)));
      setToast("Produit mis à jour");
    } catch {
      setAllProducts((prev) => prev.map((p) => (String(p.id) === String(id) ? { ...p, ...payload } : p)));
      setToast("Produit mis à jour (mock)");
    }
  }, []);
  const deleteProduct = useCallback(async (id) => {
    try {
      const auth = readAuth();
      await jdel(`/api/admin/products/${id}`, auth?.token);
      setAllProducts((prev) => prev.filter((p) => String(p.id) !== String(id)));
      setToast("Produit supprimé");
    } catch {
      setAllProducts((prev) => prev.filter((p) => String(p.id) !== String(id)));
      setToast("Produit supprimé (mock)");
    }
  }, []);

  // Seller: mise à jour stock tailles
  const updateStockBySize = useCallback(async (id, sizes) => {
    try {
      const auth = readAuth();
      const updated = await jput(`/api/products/${id}/stock`, { sizes }, auth?.token);
      setAllProducts((prev) => prev.map((p) => (String(p.id) === String(id) ? updated : p)));
      setToast("Stock mis à jour");
    } catch {
      setAllProducts((prev) =>
        prev.map((p) =>
          String(p.id) === String(id) ? { ...p, sizes, stock: sumSizes(sizes) } : p
        )
      );
      setToast("Stock mis à jour (mock)");
    }
  }, []);

  // Orders manage (vendeur/admin)
  function setOrderStatus(id, status) {
    const all = readOrdersLS();
    const now = new Date().toISOString();
    const next = all.map((o) => {
      if (String(o.id) !== String(id)) return o;
      const exists = o.timeline?.some((t) => t.code === status);
      return {
        ...o,
        status,
        timeline: [
          ...(o.timeline || []),
          ...(exists ? [] : [{ code: status, label: capitalize(status), at: now }]),
        ],
      };
    });
    writeOrdersLS(next);
    setOrdersVersion((v) => v + 1);
  }
  function advanceOrder(id) {
    const all = readOrdersLS();
    const o = all.find((x) => String(x.id) === String(id));
    if (!o) return;
    const nextS = nextStatus(o.status);
    if (nextS !== o.status) setOrderStatus(id, nextS);
  }
  function deleteOrder(id) {
    const all = readOrdersLS().filter((o) => String(o.id) !== String(id));
    writeOrdersLS(all);
    setOrdersVersion((v) => v + 1);
  }

  /* ------------------- rendu ------------------- */
  return (
    <div className="app">
      <header className="topbar">
        <div className="container topbar-inner">
          <div className="brand" onClick={() => goto("#/")} role="link" tabIndex={0}>
            <span className="logo">👟</span> <span>SNEAKERS</span>
          </div>

          <div className="search">
            <input
              placeholder="Rechercher un modèle…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Recherche"
            />
          </div>

          <nav className="nav">
            <a href="#/">Catalogue</a>
            <a href="#/cart">Panier <Badge>{cart.length}</Badge></a>
            <a href="#/privacy">Confidentialité</a>

            {hasRole(user, ["client", "admin", "seller"]) && <a href="#/orders">Mes commandes</a>}
            {hasRole(user, ["seller", "admin"]) && <a href="#/orders-manage">Gérer commandes</a>}
            {hasRole(user, ["seller"]) && <a href="#/seller">Vendeur</a>}
            {hasRole(user, ["admin"]) && <a href="#/admin">Admin</a>}

            {user ? (
              <button className="link" onClick={() => (logoutAPI(), setUser(null), goto("#/"))}>
                ({user.role}) Se déconnecter
              </button>
            ) : (
              <a href="#/login">Se connecter</a>
            )}
          </nav>
        </div>
      </header>

      {route.name === "home" && (
        <>
          <Hero />
          <section className="container section">
            <div className="filters">
              {brands.map((b) => (
                <Chip key={b} active={brand === b} onClick={() => setBrand(b)}>
                  {b === "all" ? "Toutes les marques" : b}
                </Chip>
              ))}
            </div>

            {loading ? (
              <div className="grid">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div className="card skeleton" key={i} />
                ))}
              </div>
            ) : (
              <div className="grid">
                {products.map((p) => (
                  <ProductCard key={p.id} p={p} onView={() => goto(`#/product/${p.id}`)} />
                ))}
                {products.length === 0 && <p>Aucun résultat.</p>}
              </div>
            )}
          </section>
        </>
      )}

      {route.name === "product" && (
        <section className="container section">
          <ProductDetail id={route.params.id} onAdd={addToCart} />
        </section>
      )}

      {route.name === "cart" && (
        <section className="container section">
          <CartPage
            cart={cart}
            products={allProducts}
            total={total}
            onQty={setQty}
            onRemove={removeLine}
            onClear={clearCart}
            onCheckout={() => goto("#/checkout")}
          />
        </section>
      )}

      {route.name === "checkout" && (
        <section className="container section">
          <CheckoutPage
            cart={cart}
            products={allProducts}
            total={total}
            onConfirm={doCheckout}
          />
        </section>
      )}

      {route.name === "order" && (
        <section className="container section">
          <OrderConfirmation id={route.params.id} />
        </section>
      )}

      {route.name === "orders" && (
        <section className="container section">
          <OrdersPage products={allProducts} />
        </section>
      )}

      {route.name === "ordersManage" && (
        <section className="container section">
          <Guard user={user} roles={["seller", "admin"]}>
            <OrdersManagePage
              onAdvance={advanceOrder}
              onSetStatus={setOrderStatus}
              onDelete={deleteOrder}
              version={ordersVersion}
            />
          </Guard>
        </section>
      )}

      {route.name === "login" && (
        <section className="container section">
          <LoginPage
            onSubmit={async (email, pass) => {
              try {
                const u = await loginAPI(email, pass);
                setUser(u);
                setToast(`Connecté en tant que ${u.role}`);
                goto("#/");
              } catch (e) {
                setToast(e.message || "Échec de connexion");
              }
            }}
          />
          <p className="hint">
            Démo : <code>admin@test.com / admin</code> ·{" "}
            <code>seller@test.com / seller</code> ·{" "}
            <code>client@test.com / client</code>
          </p>
        </section>
      )}

      {route.name === "privacy" && (
        <section className="container section">
          <h1>Politique de confidentialité</h1>
          <p>
            Données minimales (commande) : e-mail, nom, adresse. Export & suppression à la
            demande. Cookies strictement nécessaires au fonctionnement du site.
          </p>
          <Button kind="ghost" onClick={() => (localStorage.removeItem(cookieKey), goto("#/"))}>
            Gérer mes cookies (réinitialiser le bandeau)
          </Button>
        </section>
      )}

      {route.name === "admin" && (
        <section className="container section">
          <Guard user={user} roles={["admin"]}>
            <AdminDashboard
              products={allProducts}
              onCreate={createProduct}
              onUpdate={updateProduct}
              onDelete={deleteProduct}
            />
          </Guard>
        </section>
      )}

      {route.name === "seller" && (
        <section className="container section">
          <Guard user={user} roles={["seller", "admin"]}>
            <SellerDashboard products={allProducts} onUpdateStock={updateStockBySize} />
          </Guard>
        </section>
      )}

      <footer className="footer">
        <div className="container">
          <span>© {new Date().getFullYear()} Sneakers Shop</span>
          <a href="#/privacy">Confidentialité</a>
        </div>
      </footer>

      <CookieBanner />
      <Toast msg={toast} onClose={() => setToast("")} />
    </div>
  );
}

/* -------------------------------------------------------
   COMPOSANTS
--------------------------------------------------------*/
function Hero() {
  return (
    <section className="hero">
      <div className="container hero-inner">
        <div className="hero-copy">
          <h1>Les sneakers qui font tourner les têtes.</h1>
          <p>Découvre notre sélection : drops, classiques et exclus.</p>
          <a href="#/" className="btn primary">Voir le catalogue</a>
        </div>
        <div className="hero-art" aria-hidden="true">👟</div>
      </div>
    </section>
  );
}

function ProductCard({ p, onView }) {
  const price = p.price ?? derivePrice(p);
  return (
    <article className="card">
      <div className="card-media">
        <img src={resolveImg(p.link, p.name)} alt={p.name} loading="lazy" />
        {(p.stock ?? 10) <= 0 && <span className="ribbon">Rupture</span>}
      </div>
      <div className="card-body">
        <div className="card-title">{p.name}</div>
        <div className="card-meta">
          <span className="price">{formatPrice(price)}</span>
        </div>
        <Button onClick={onView}>Voir</Button>
      </div>
    </article>
  );
}

function sizesForProduct(p) {
  if (p && p.sizes && typeof p.sizes === "object") return Object.keys(p.sizes);
  return defaultSizes(p);
}

function ProductDetail({ id, onAdd }) {
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        try {
          const one = await jget(`/api/products/${id}`);
          setP(one);
        } catch {
          const all = await jget(`/api/products`);
          setP(all.find((x) => String(x.id) === String(id)) || null);
        }
      } catch {
        setP(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <p>Chargement…</p>;
  if (!p) return <p>Produit introuvable.</p>;

  const price = p.price ?? derivePrice(p);
  const sizes = sizesForProduct(p);
  const stockFor = (s) => {
    if (p?.sizes && p.sizes[s] != null) return p.sizes[s];
    return p?.stock ?? 5;
  };

  return (
    <div className="pdetail">
      <div className="pdetail-media">
        <img src={resolveImg(p.link, p.name)} alt={p.name} />
      </div>
      <div className="pdetail-body">
        <a className="link" href="#/">← Retour au catalogue</a>
        <h1>{p.name}</h1>
        <div className="pdetail-price">{formatPrice(price)}</div>

        <div className="pdetail-opts">
          <label>Taille</label>
          <div className="sizes">
            {sizes.map((s) => {
              const out = stockFor(s) <= 0;
              return (
                <button
                  key={s}
                  className={`size ${size === s ? "active" : ""}`}
                  onClick={() => !out && setSize(s)}
                  disabled={out}
                  title={out ? "Rupture" : undefined}
                >
                  {s}
                </button>
              );
            })}
          </div>

          <label htmlFor="qty">Quantité</label>
          <input
            id="qty"
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
          />
        </div>

        <Button disabled={!size} onClick={() => onAdd(p, size, qty)}>
          Ajouter au panier
        </Button>
      </div>
    </div>
  );
}

function CartPage({ cart, products, total, onQty, onRemove, onClear, onCheckout }) {
  if (cart.length === 0)
    return (
      <>
        <h1>Panier</h1>
        <p>Votre panier est vide.</p>
        <a className="btn primary" href="#/">← Continuer mes achats</a>
      </>
    );

  return (
    <>
      <h1>Panier</h1>
      <div className="cart">
        <div className="cart-lines">
          {cart.map((it, i) => {
            const p = products.find((x) => x.id === it.id);
            const price = (p?.price ?? derivePrice(p)) * it.qty;
            return (
              <div className="cart-line" key={`${it.id}-${it.size}-${i}`}>
                <img src={resolveImg(p?.link, p?.name)} alt={p?.name || "Produit"} />
                <div className="cart-info">
                  <div className="name">{p?.name}</div>
                  <div className="muted">Taille {it.size}</div>
                </div>
                <input
                  className="qty"
                  type="number"
                  min={1}
                  value={it.qty}
                  onChange={(e) => onQty(it, Math.max(1, Number(e.target.value || 1)))}
                  aria-label="Quantité"
                />
                <div className="price">{formatPrice(price)}</div>
                <button className="link danger" onClick={() => onRemove(it)}>
                  Retirer
                </button>
              </div>
            );
          })}
          <div className="cart-actions">
            <button className="link" onClick={onClear}>Vider le panier</button>
            <div className="total">Total : {formatPrice(total)}</div>
          </div>
          <div className="cart-cta">
            <Button onClick={onCheckout}>Passer au paiement</Button>
          </div>
        </div>
      </div>
    </>
  );
}

function CheckoutPage({ cart, products, total, onConfirm }) {
  if (cart.length === 0) return <p>Panier vide.</p>;
  const [form, setForm] = useState({ email: "", name: "", address: "" });

  return (
    <>
      <h1>Paiement</h1>
      <div className="checkout">
        <form
          className="checkout-form"
          onSubmit={(e) => {
            e.preventDefault();
            onConfirm(form);
          }}
        >
          <label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Nom<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Adresse<textarea rows={3} required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
          <Button type="submit">Payer {formatPrice(total)}</Button>
        </form>

        <aside className="summary">
          <strong>Récapitulatif</strong>
          <ul>
            {cart.map((it, i) => {
              const p = products.find((x) => x.id === it.id);
              return (
                <li key={i}>
                  {p?.name} × {it.qty} (T{it.size})
                </li>
              );
            })}
          </ul>
          <div className="sum-total">{formatPrice(total)}</div>
        </aside>
      </div>
    </>
  );
}

function OrderConfirmation({ id }) {
  const order = readOrdersLS().find((o) => String(o.id) === String(id));
  if (!order) return <p>Commande {id} introuvable.</p>;
  return (
    <>
      <h1>Commande #{order.id}</h1>
      <p className="muted">Date : {new Date(order.date).toLocaleString("fr-FR")}</p>
      <div className="panel">
        <p><strong>Total :</strong> {formatPrice(order.total)}</p>
        <p><strong>Statut :</strong> <Badge>{order.status}</Badge></p>
      </div>
      <OrderTimeline order={order} />
      <a className="btn primary" href="#/orders" style={{ marginTop: 16 }}>Voir mes commandes</a>
    </>
  );
}

function OrderTimeline({ order }) {
  const tl = order.timeline || [];
  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <h3 style={{ marginTop: 0 }}>Suivi</h3>
      <ul className="timeline">
        {STATUS_FLOW.map((step) => {
          const hit = tl.find((t) => t.code === step);
          return (
            <li key={step} className={hit ? "done" : ""}>
              <span className="dot" />
              <div className="tline">
                <div className="tlabel">{capitalize(step)}</div>
                <div className="tdate">{hit ? new Date(hit.at).toLocaleString("fr-FR") : "—"}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function OrdersPage() {
  const [orders, setOrders] = useState(() => readOrdersLS());
  useEffect(() => {
    const on = () => setOrders(readOrdersLS());
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);
  if (!orders.length) return <p>Aucune commande pour le moment.</p>;
  return (
    <>
      <h1>Mes commandes</h1>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Commande</th><th>Date</th><th>Articles</th><th>Total</th><th>Statut</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><a className="link" href={`#/order/${o.id}`}>{o.id}</a></td>
                <td>{new Date(o.date).toLocaleString("fr-FR")}</td>
                <td>{o.items.length}</td>
                <td>{formatPrice(o.total)}</td>
                <td><Badge>{o.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function OrdersManagePage({ onAdvance, onSetStatus, onDelete, version }) {
  const [filter, setFilter] = useState("all");
  const [orders, setOrders] = useState(() => readOrdersLS());
  useEffect(() => { setOrders(readOrdersLS()); }, [version]);
  const list = orders.filter((o) => filter === "all" ? true : o.status === filter);

  return (
    <>
      <h1>Gérer les commandes</h1>
      <div className="panel" style={{ marginBottom: 16 }}>
        <strong>Filtre :</strong>{" "}
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Toutes</option>
          {STATUS_FLOW.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
        </select>
      </div>

      {!list.length ? (
        <p>Aucune commande.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Commande</th><th>Date</th><th>Total</th><th>Statut</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id}>
                  <td><a className="link" href={`#/order/${o.id}`}>{o.id}</a></td>
                  <td>{new Date(o.date).toLocaleString("fr-FR")}</td>
                  <td>{formatPrice(o.total)}</td>
                  <td><Badge>{o.status}</Badge></td>
                  <td>
                    <Button kind="ghost" onClick={() => onAdvance(o.id)}>Étape suivante</Button>{" "}
                    <select
                      value={o.status}
                      onChange={(e) => onSetStatus(o.id, e.target.value)}
                      style={{ marginRight: 8 }}
                    >
                      {STATUS_FLOW.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
                    </select>
                    <button className="link danger" onClick={() => onDelete(o.id)}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function AdminDashboard({ products, onCreate, onUpdate, onDelete }) {
  const [draft, setDraft] = useState({
    name: "",
    price: 99,
    stock: 10,
    category: "hommes",
    link: "/images/placeholder.jpg",
    sizes: toSizesObj(defaultSizes()),
  });
  const [editing, setEditing] = useState(null); // { id, patch }

  function tryParseSizes(input) {
    // accepte JSON {"40":3,"41":0} OU "40:3,41:0,42:2"
    try {
      const obj = JSON.parse(input);
      if (obj && typeof obj === "object") return obj;
    } catch {}
    const map = {};
    input.split(",").forEach((kv) => {
      const [k, v] = kv.split(":").map((s) => s && s.trim());
      if (!k) return;
      map[k] = Number(v || 0);
    });
    return map;
  }

  function onCreateClick() {
    const payload = {
      name: draft.name.trim(),
      price: Number(draft.price || 0),
      stock: Number(draft.stock || 0),
      category: draft.category,
      link: draft.link,
      sizes: draft.sizes,
    };
    if (!payload.name) return alert("Nom requis");
    onCreate(payload);
    setDraft({ name: "", price: 99, stock: 10, category: "hommes", link: "/images/placeholder.jpg", sizes: toSizesObj(defaultSizes()) });
  }

  function onSaveRow(id) {
    const patch = editing?.patch || {};
    // normaliser sizes si string
    if (typeof patch.sizes === "string") patch.sizes = tryParseSizes(patch.sizes);
    onUpdate(id, patch);
    setEditing(null);
  }

  return (
    <>
      <h1>Admin — Produits</h1>

      <div className="panel" style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Créer un produit</h3>
        <div className="admin-form">
          <input placeholder="Nom" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input type="number" placeholder="Prix" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value||0) })} />
          <input type="number" placeholder="Stock" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value||0) })} />
          <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
            <option value="enfants">Enfants</option>
            <option value="hommes">Hommes</option>
            <option value="femmes">Femmes</option>
          </select>
          <input placeholder="Image (URL ou /images/...)" value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} />
          <textarea rows={2} placeholder='Tailles (JSON ou "40:3,41:0,42:2")'
            value={typeof draft.sizes === "string" ? draft.sizes : JSON.stringify(draft.sizes)}
            onChange={(e) => setDraft({ ...draft, sizes: e.target.value })} />
          <Button onClick={onCreateClick}>Créer</Button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>#</th><th>Nom</th><th>Prix</th><th>Stock</th><th>Catégorie</th><th>Image</th><th>Tailles</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {products.slice(0, 50).map((p) => {
              const isEd = editing?.id === p.id;
              const patch = isEd ? editing.patch : {};
              const val = (k, def) => (patch[k] ?? p[k] ?? def);

              return (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>
                    {isEd ? (
                      <input value={val("name","")} onChange={(e) => setEditing({ id: p.id, patch: { ...patch, name: e.target.value } })} />
                    ) : p.name}
                  </td>
                  <td>
                    {isEd ? (
                      <input type="number" value={val("price", derivePrice(p))} onChange={(e) => setEditing({ id: p.id, patch: { ...patch, price: Number(e.target.value||0) } })} />
                    ) : formatPrice(p.price ?? derivePrice(p))}
                  </td>
                  <td>
                    {isEd ? (
                      <input type="number" value={val("stock", sumSizes(p.sizes) ?? 0)} onChange={(e) => setEditing({ id: p.id, patch: { ...patch, stock: Number(e.target.value||0) } })} />
                    ) : (p.stock ?? sumSizes(p.sizes) ?? 0)}
                  </td>
                  <td>
                    {isEd ? (
                      <select value={val("category","")} onChange={(e) => setEditing({ id: p.id, patch: { ...patch, category: e.target.value } })}>
                        <option value="enfants">Enfants</option>
                        <option value="hommes">Hommes</option>
                        <option value="femmes">Femmes</option>
                        <option value="">—</option>
                      </select>
                    ) : (p.category || "—")}
                  </td>
                  <td className="muted" style={{ maxWidth: 180 }}>
                    {isEd ? (
                      <input value={val("link", "")} onChange={(e) => setEditing({ id: p.id, patch: { ...patch, link: e.target.value } })} />
                    ) : <a className="link" href={resolveImg(p.link, p.name)} target="_blank" rel="noreferrer">voir</a>}
                  </td>
                  <td style={{ maxWidth: 220 }}>
                    {isEd ? (
                      <textarea rows={2}
                        value={typeof val("sizes", p.sizes) === "string" ? val("sizes", p.sizes) : JSON.stringify(val("sizes", p.sizes))}
                        onChange={(e) => setEditing({ id: p.id, patch: { ...patch, sizes: e.target.value } })}
                      />
                    ) : (p.sizes ? Object.entries(p.sizes).map(([k,v]) => `${k}:${v}`).join(", ") : "—")}
                  </td>
                  <td>
                    {isEd ? (
                      <>
                        <Button kind="ghost" onClick={() => onSaveRow(p.id)}>Enregistrer</Button>{" "}
                        <button className="link" onClick={() => setEditing(null)}>Annuler</button>
                      </>
                    ) : (
                      <>
                        <Button kind="ghost" onClick={() => setEditing({ id: p.id, patch: {} })}>Éditer</Button>{" "}
                        <button className="link danger" onClick={() => onDelete(p.id)}>Supprimer</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted">Astuce : pour la démo, seules les 50 premières lignes sont affichées.</p>
    </>
  );
}

function SellerDashboard({ products, onUpdateStock }) {
  const [pid, setPid] = useState(products[0]?.id || "");
  const p = products.find((x) => String(x.id) === String(pid));
  const [sizes, setSizes] = useState(() => p?.sizes || toSizesObj(defaultSizes(p)));

  useEffect(() => {
    const next = products.find((x) => String(x.id) === String(pid));
    setSizes(next?.sizes || toSizesObj(defaultSizes(next)));
  }, [pid, products]);

  if (!products.length) return <p>Aucun produit.</p>;

  return (
    <>
      <h1>Vendeur — Stocks</h1>

      <div className="panel" style={{ marginBottom: 24 }}>
        <label>Produit</label>
        <select value={pid} onChange={(e) => setPid(e.target.value)}>
          {products.slice(0, 100).map((pp) => (
            <option key={pp.id} value={pp.id}>{pp.id} — {pp.name}</option>
          ))}
        </select>
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>{p?.name}</h3>
        <div className="sizes-grid">
          {Object.keys(sizes).map((s) => (
            <div key={s} className="sizes-row">
              <span className="size-label">{s}</span>
              <input
                type="number"
                min={0}
                value={sizes[s]}
                onChange={(e) => setSizes({ ...sizes, [s]: Math.max(0, Number(e.target.value||0)) })}
              />
            </div>
          ))}
        </div>
        <div className="sizes-actions">
          <Button onClick={() => onUpdateStock(pid, sizes)}>Enregistrer le stock</Button>
        </div>
      </div>
    </>
  );
}

function LoginPage({ onSubmit }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  return (
    <>
      <h1>Connexion</h1>
      <form
        className="login"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(email, pass);
        }}
      >
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Mot de passe<input type="password" value={pass} onChange={(e) => setPass(e.target.value)} required /></label>
        <Button type="submit">Se connecter</Button>
      </form>
    </>
  );
}

/* -------------------------------------------------------
   HELPERS (Admin/Seller)
--------------------------------------------------------*/
function toSizesObj(arr = ["40","41","42","43","44","45"]) {
  return Object.fromEntries(arr.map((s) => [s, 3]));
}
function sumSizes(sizes) {
  if (!sizes) return 0;
  return Object.values(sizes).reduce((a, b) => a + Number(b || 0), 0);
}
function capitalize(s = "") {
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}
