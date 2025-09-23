import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer style={styles.foot}>
      <div style={styles.container}>
        <div>
          <strong>SneakersShop</strong> — boutique d’exemple.
        </div>
        <nav style={{display:"flex", gap:16}}>
          <Link to="/legal" style={styles.link}>Confidentialité / RGPD</Link>
          <a href="mailto:contact@sneakers.local" style={styles.link}>Contact</a>
        </nav>
      </div>
    </footer>
  );
}

const styles = {
  foot: { marginTop: 40, borderTop:"1px solid #eee", background:"#fff" },
  container: { maxWidth: 1200, margin:"0 auto", padding:"18px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", color:"#111" },
  link: { color:"#111", textDecoration:"none", opacity:.8 }
};
