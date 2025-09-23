// sneakers-frontend/src/main.jsx
import "./index.css";// <-- important
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";



// petit filet de sécurité si #root n'existe pas
let rootEl = document.getElementById("root");
if (!rootEl) {
  rootEl = document.createElement("div");
  rootEl.id = "root";
  document.body.appendChild(rootEl);
}

console.log("APP: boot @", new Date().toISOString());
createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
setTimeout(() => console.log("APP: React rendu, banner retiré"), 0);
