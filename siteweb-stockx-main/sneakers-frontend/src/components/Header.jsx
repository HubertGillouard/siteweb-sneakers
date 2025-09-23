import React from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useCart } from "../contexts/CartContext.jsx";

export default function Header() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const count = items?.reduce((n, it) => n + (it.qty || 1), 0) || 0;

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <Link to="/" style={styles.brand}>
          <img src="/logo.svg" alt="" style={{ height: 28, marginRight: 10 }} />
          <span>Sneakers<span style={{color:"#8b5cf6"}}>Shop</span></span>
        </Link>

        <nav style={styles.nav}>
          <NavLink to="/" style={styles.link}>Accueil</NavLink>
          <NavLink to="/catalog" style={styles.link}>Catalogue</NavLink>
          <NavLink to="/legal" style={styles.link}>RGPD</NavLink>
        </nav>

        <div style={styles.actions}>
          {user ? (
            <>
              <Link to="/profile" style={styles.linkSm}>Bonjour, {user.email}</Link>
              <button onClick={logout} style={styles.btnGhost}>Se déconnecter</button>
              {user.role === "admin" && <Link to="/admin" style={styles.btn}>Admin</Link>}
              {user.role === "seller" && <Link to="/seller" style={styles.btn}>Vendeur</Link>}
            </>
          ) : (
            <Link to="/login" style={styles.btn}>Se connecter</Link>
          )}

          <Link to="/cart" style={{...styles.btnCart, position:"relative"}}>
            🛒 Panier
            {count > 0 && (
              <span style={styles.badge}>{count}</span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

const styles = {
  header: {
    position: "sticky",
    top: 0,
    zIndex: 1000,
    background: "rgba(17,24,39,.85)",
    backdropFilter: "blur(8px)",
    borderBottom: "1px solid rgba(255,255,255,.06)",
  },
  container: {
    maxWidth: 1200, margin: "0 auto", padding: "12px 16px",
    display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff",
  },
  brand: { display: "flex", alignItems: "center", fontWeight: 800, fontSize: 20, textDecoration: "none", color: "#fff" },
  nav: { display: "flex", gap: 16, alignItems: "center" },
  link: ({ isActive }) => ({
    color: isActive ? "#fff" : "rgba(255,255,255,.85)",
    textDecoration: "none",
    fontWeight: 500
  }),
  actions: { display: "flex", gap: 8, alignItems: "center" },
  linkSm: { color: "rgba(255,255,255,.85)", textDecoration: "none", fontSize: 14 },
  btn: { background:"#8b5cf6", color:"#fff", padding:"8px 12px", borderRadius:8, textDecoration:"none", fontWeight:600 },
  btnGhost: { background:"transparent", color:"#fff", padding:"8px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,.2)" },
  btnCart: { background:"#111827", color:"#fff", padding:"8px 12px", borderRadius:8, textDecoration:"none", border:"1px solid rgba(255,255,255,.12)" },
  badge: {
    position:"absolute", top:-6, right:-6, background:"#ef4444", color:"#fff",
    borderRadius:999, fontSize:12, lineHeight:"18px", height:18, minWidth:18,
    textAlign:"center", padding:"0 5px", border:"2px solid #111827"
  }
};
