import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../api";
import ProductCard from "../components/ProductCard.jsx";

export default function Home() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await getProducts();
        setItems(Array.isArray(list) ? list.slice(0, 12) : []);
      } catch (e) {
        console.error(e);
        setItems([]);
      }
    })();
  }, []);

  return (
    <div>
      <Hero />
      <section style={{maxWidth:1200, margin:"40px auto", padding:"0 16px"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:16}}>
          <h2 style={{margin:0}}>Nouveautés</h2>
          <Link to="/catalog" style={styles.link}>Voir tout →</Link>
        </div>

        {!items && <div style={styles.skeletonGrid}>{Array.from({length:12}).map((_,i)=><div key={i} style={styles.skeleton}/>)}</div>}

        {items && (
          <div style={styles.grid}>
            {items.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function Hero() {
  return (
    <section style={styles.hero}>
      <div style={styles.heroInner}>
        <h1 style={styles.h1}>La crème des <span style={{color:"#a78bfa"}}>sneakers</span></h1>
        <p style={styles.p}>Catalogue, panier, paiement fictif et authentification — tout ce qu’il faut pour une boutique moderne.</p>
        <div style={{display:"flex", gap:12, flexWrap:"wrap"}}>
          <Link to="/catalog" style={styles.cta}>Découvrir le catalogue</Link>
          <Link to="/login" style={styles.ctaGhost}>Se connecter</Link>
        </div>
      </div>
    </section>
  );
}

const styles = {
  link: { color:"#6b21a8", textDecoration:"none", fontWeight:600 },
  grid: {
    display:"grid",
    gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))",
    gap:16
  },
  skeletonGrid: {
    display:"grid",
    gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))",
    gap:16
  },
  skeleton: { background:"#eee", borderRadius:16, aspectRatio:"4/3" },
  hero: {
    background:"radial-gradient(1000px 400px at 10% 0%, #4c1d95 0%, #111827 50%, #0b0f1a 100%)",
    color:"#fff"
  },
  heroInner: { maxWidth:1200, margin:"0 auto", padding:"60px 16px" },
  h1: { fontSize:44, lineHeight:1.1, margin:"0 0 10px", fontWeight:800 },
  p: { margin:"0 0 20px", opacity:.9, maxWidth:720 },
  cta: { background:"#8b5cf6", color:"#fff", padding:"10px 14px", borderRadius:10, textDecoration:"none", fontWeight:700 },
  ctaGhost: { background:"transparent", color:"#fff", padding:"10px 14px", borderRadius:10, textDecoration:"none", border:"1px solid rgba(255,255,255,.3)", fontWeight:600 },
};
