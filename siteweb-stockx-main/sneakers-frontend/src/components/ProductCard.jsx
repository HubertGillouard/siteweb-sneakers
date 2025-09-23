import React from "react";
import { Link } from "react-router-dom";
import { resolveImg, formatPrice } from "../api";

export default function ProductCard({ product }) {
  const img = resolveImg(product?.link);
  const price = product?.price ?? 129.99;

  return (
    <Link to={`/product/${product.id}`} style={styles.card}>
      <div style={styles.imgWrap}>
        <img src={img} alt={product?.name} style={styles.img} loading="lazy" />
        <span style={styles.badge}>En stock</span>
      </div>
      <div style={styles.body}>
        <div style={styles.name}>{product?.name || "Sneakers"}</div>
        <div style={styles.price}>{formatPrice(price)}</div>
      </div>
    </Link>
  );
}

const styles = {
  card: {
    display:"block", background:"#fff", borderRadius:16, overflow:"hidden",
    border:"1px solid #eee", textDecoration:"none", color:"#111", transition:"transform .15s ease",
  },
  imgWrap: { position:"relative", aspectRatio:"4/3", background:"#f6f6f6", overflow:"hidden" },
  img: { width:"100%", height:"100%", objectFit:"cover", display:"block", transform:"scale(1.02)" },
  badge: { position:"absolute", left:10, top:10, background:"#111827", color:"#fff", padding:"4px 8px", borderRadius:8, fontSize:12 },
  body: { padding:12, display:"grid", gap:6 },
  name: { fontWeight:600, lineHeight:1.2 },
  price: { fontWeight:800 }
};
