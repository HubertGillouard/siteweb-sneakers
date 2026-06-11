const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'data');
const imgDir = path.join(root, 'public', 'images');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(imgDir, { recursive: true });

function safe(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function sneakerSvg({ brand, model, category, colorA, colorB, sole, accent, index }) {
  const catLabel = category === 'hommes' ? 'HOMMES' : category === 'femmes' ? 'FEMMES' : 'ENFANTS';
  const pattern = index % 3;
  const logo = brand.slice(0, 2).toUpperCase();
  const stripes = pattern === 0
    ? `<path d="M470 385 L515 300 M535 392 L580 307 M600 398 L645 315" stroke="${accent}" stroke-width="22" stroke-linecap="round" opacity="0.92"/>`
    : pattern === 1
      ? `<path d="M420 372 C510 318 610 300 720 332" stroke="${accent}" stroke-width="28" stroke-linecap="round" fill="none" opacity="0.9"/>`
      : `<circle cx="545" cy="350" r="42" fill="${accent}" opacity="0.9"/><text x="545" y="360" text-anchor="middle" font-family="Arial" font-size="24" font-weight="900" fill="#fff">${logo}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="48%" stop-color="#111827"/>
      <stop offset="100%" stop-color="${colorA}"/>
    </linearGradient>
    <linearGradient id="shoe" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colorB}"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="30" stdDeviation="28" flood-color="#000" flood-opacity="0.42"/>
    </filter>
  </defs>
  <rect width="1200" height="900" rx="0" fill="url(#bg)"/>
  <circle cx="1000" cy="145" r="230" fill="${accent}" opacity="0.20"/>
  <circle cx="155" cy="750" r="250" fill="${colorB}" opacity="0.16"/>
  <path d="M95 195 C245 95 415 80 635 120 C815 153 1010 265 1115 390" stroke="#fff" stroke-opacity="0.08" stroke-width="34" fill="none"/>

  <g filter="url(#shadow)" transform="translate(95 210) rotate(-4 520 260)">
    <path d="M102 319 C165 250 246 204 362 183 C448 167 550 176 628 205 C706 234 773 291 842 317 C910 342 978 331 1026 326 C1048 360 1068 403 1074 447 C980 501 802 513 637 491 C493 472 373 433 222 425 C157 421 103 386 76 351 Z" fill="url(#shoe)"/>
    <path d="M86 392 C190 459 360 488 607 505 C792 518 964 500 1078 455 C1088 488 1071 525 1034 545 C806 603 567 576 360 535 C235 510 125 492 59 436 C55 414 65 399 86 392 Z" fill="${sole}"/>
    <path d="M190 398 C315 443 460 462 646 474 C792 484 946 472 1049 432" stroke="#0f172a" stroke-width="16" stroke-linecap="round" fill="none" opacity="0.55"/>
    <path d="M285 367 L390 220 L628 244 L770 330" stroke="#111827" stroke-width="22" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.78"/>
    <path d="M365 278 C450 302 525 314 648 309" stroke="#0f172a" stroke-opacity="0.50" stroke-width="14" fill="none" stroke-linecap="round"/>
    <path d="M377 305 L630 330" stroke="#0f172a" stroke-opacity="0.35" stroke-width="12" stroke-linecap="round"/>
    ${stripes}
    <path d="M154 336 C229 338 286 319 326 276" stroke="#fff" stroke-width="14" stroke-linecap="round" opacity="0.45" fill="none"/>
    <path d="M780 327 C866 373 947 378 1040 350" stroke="#fff" stroke-width="16" stroke-linecap="round" opacity="0.55" fill="none"/>
  </g>

  <text x="88" y="105" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="900">${brand}</text>
  <text x="88" y="153" fill="#dbeafe" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="700">${model} · ${catLabel}</text>
  <text x="88" y="810" fill="#ffffff" opacity="0.70" font-family="Arial, Helvetica, sans-serif" font-size="20">Image produit locale générée · aucune dépendance externe</text>
</svg>`;
}

const palettes = [
  ['#7c3aed', '#e0e7ff', '#f8fafc', '#a855f7'],
  ['#2563eb', '#bfdbfe', '#f1f5f9', '#38bdf8'],
  ['#dc2626', '#fee2e2', '#fff7ed', '#fb7185'],
  ['#16a34a', '#dcfce7', '#f8fafc', '#22c55e'],
  ['#ea580c', '#ffedd5', '#fef3c7', '#f97316'],
  ['#0891b2', '#cffafe', '#ecfeff', '#06b6d4'],
  ['#be185d', '#fce7f3', '#fff1f2', '#ec4899'],
  ['#374151', '#f3f4f6', '#e5e7eb', '#111827'],
  ['#4338ca', '#ddd6fe', '#eef2ff', '#6366f1'],
  ['#0f766e', '#ccfbf1', '#f0fdfa', '#14b8a6']
];

const brands = ['Nike', 'Adidas', 'Jordan', 'New Balance', 'Puma', 'Asics'];
const models = ['Air Runner', 'Campus Court', 'Retro High', 'Fresh Foam', 'Suede Street', 'Gel Pulse', 'Zoom Flux', 'Forum Move', 'Dunk Low', 'Ultra Glide'];
const categories = [
  { key: 'hommes', sizes: ['40','41','42','43','44','45'] },
  { key: 'femmes', sizes: ['36','37','38','39','40','41'] },
  { key: 'enfants', sizes: ['28','29','30','31','32','33','34','35'] }
];

const imagePool = [
  { brand: 'Nike', model: 'Air Runner', file: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=80' },
  { brand: 'Nike', model: 'Dunk Low', file: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=900&q=80' },
  { brand: 'Nike', model: 'Air Max', file: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=900&q=80' },
  { brand: 'Adidas', model: 'Forum Move', file: 'https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?auto=format&fit=crop&w=900&q=80' },
  { brand: 'Adidas', model: 'Campus Court', file: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=900&q=80' },
  { brand: 'Jordan', model: 'Retro High', file: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80' },
  { brand: 'New Balance', model: 'Fresh Foam', file: 'https://images.unsplash.com/photo-1562183241-b937e95585b6?auto=format&fit=crop&w=900&q=80' },
  { brand: 'Puma', model: 'Suede Street', file: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=900&q=80' },
  { brand: 'Asics', model: 'Gel Pulse', file: 'https://images.unsplash.com/photo-1543508282-6319a3e2621f?auto=format&fit=crop&w=900&q=80' },
  { brand: 'SneakR', model: 'Urban Flow', file: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=900&q=80' },
  { brand: 'Nike', model: 'Zoom Flux', file: 'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?auto=format&fit=crop&w=900&q=80' },
  { brand: 'Adidas', model: 'Ultra Glide', file: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&w=900&q=80' }
];

// Un fallback local existe uniquement si Internet coupe pendant la démo.
fs.writeFileSync(path.join(imgDir, 'placeholder.svg'), sneakerSvg({ brand: 'SneakR', model: 'Fallback', category: 'hommes', colorA: '#111827', colorB: '#e5e7eb', sole: '#f8fafc', accent: '#7c3aed', index: 0 }), 'utf8');

const products = [];
for (let i = 1; i <= 120; i++) {
  const c = categories[(i - 1) % categories.length];
  const image = imagePool[(i - 1) % imagePool.length];
  const brand = image.brand;
  const model = image.model;
  const price = 79 + (i % 12) * 8 + (c.key === 'enfants' ? -18 : c.key === 'femmes' ? 5 : 12);
  const originalPrice = price + 20 + (i % 4) * 5;
  products.push({
    id: i,
    brand,
    name: `${brand} ${model} ${100 + i}`,
    category: c.key,
    gender: c.key,
    price,
    originalPrice,
    image: image.file,
    description: `${brand} ${model} ${100 + i} : sneaker ${c.key} avec fiche produit enrichie, tailles réalistes et stock suivi par pointure.`,
    colorway: ['Onyx / Violet','Blue Ice','Red Cream','Mint Black','Orange Sand','Pink Glow'][i % 6],
    badge: i % 7 === 0 ? 'Stock limité' : i % 5 === 0 ? 'Éco sélection' : i % 3 === 0 ? 'Best Seller' : 'Nouveau',
    featured: i <= 12 || i % 11 === 0,
    variants: c.sizes.map((size, idx) => ({
      sku: `${safe(brand).toUpperCase()}-${String(i).padStart(3, '0')}-${size}`,
      size,
      stock: ((i + idx * 2) % 11) + (idx % 3 === 0 ? 1 : 0),
      price
    }))
  });
}

const users = [
  { id: 1, email: 'admin@test.com', password: 'admin', role: 'admin', firstName: 'Max', lastName: 'Admin' },
  { id: 2, email: 'seller@test.com', password: 'seller', role: 'seller', firstName: 'Hubert', lastName: 'Seller' },
  { id: 3, email: 'client@test.com', password: 'client', role: 'client', firstName: 'Jean', lastName: 'Client' }
];

fs.writeFileSync(path.join(dataDir, 'products.json'), JSON.stringify(products, null, 2), 'utf8');
fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(users, null, 2), 'utf8');
fs.writeFileSync(path.join(dataDir, 'orders.json'), JSON.stringify([], null, 2), 'utf8');
fs.writeFileSync(path.join(dataDir, 'settings.json'), JSON.stringify({ brandName: 'SneakR Elite', accent: '#7c3aed', imageCount: imagePool.length, imageMode: 'online-mapping' }, null, 2), 'utf8');
console.log(`Seed terminé : ${products.length} produits, ${imagePool.length} images en ligne mappées, 3 comptes, stocks par taille.`);
