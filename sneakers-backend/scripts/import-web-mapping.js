/*
  Import catalogue sneakers
  -------------------------
  Objectif : alimenter le catalogue avec des données externes quand c'est possible,
  puis les convertir dans notre modèle e-commerce : produits, images, tailles,
  stocks internes et catégories.

  Ordre :
  1. KicksDB si KICKSDB_API_KEY est renseignée dans .env.
  2. Catalogues publics Shopify de boutiques sneakers.
  3. Petit catalogue de secours local si Internet/API indisponible.

  Important : les sources externes donnent surtout nom, marque, image, prix.
  Le stock par taille reste géré par notre backend, puis décrémenté au checkout.
  Il ne s'agit pas d'un flux temps réel direct vers Nike/StockX, mais d'un import et d'un mapping contrôlé.
*/
try { require('dotenv').config(); } catch {}

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const MAPPING_DIR = path.join(DATA_DIR, 'mapping');
const MAPPING_AUDIT_FILE = path.join(MAPPING_DIR, 'last-import.json');

const TARGET_DEFAULT = Number(process.env.MAPPING_TARGET || 100);

const QUERIES = [
  'nike air max',
  'nike dunk',
  'air jordan',
  'adidas samba',
  'adidas campus',
  'new balance 550',
  'new balance 9060',
  'puma suede',
  'asics gel',
  'converse chuck'
];

const SHOPIFY_SOURCES = [
  { name: 'Kith public Shopify catalogue', sourceType: 'shopify-products-json', baseUrl: 'https://kith.com', url: 'https://kith.com/products.json?limit=250' },
  { name: 'Sneaker Politics public Shopify catalogue', sourceType: 'shopify-products-json', baseUrl: 'https://sneakerpolitics.com', url: 'https://sneakerpolitics.com/products.json?limit=250' },
  { name: 'Feature public Shopify catalogue', sourceType: 'shopify-products-json', baseUrl: 'https://feature.com', url: 'https://feature.com/products.json?limit=250' }
];

const SOURCES = [
  {
    name: 'KicksDB API',
    sourceType: 'api-key',
    env: 'KICKSDB_API_KEY',
    enabled: Boolean(process.env.KICKSDB_API_KEY),
    url: 'https://api.kicks.dev/v3/stockx/products?query=...'
  },
  ...SHOPIFY_SOURCES.map((source) => ({ ...source, env: null, enabled: true }))
];

const LOCAL_BACKUP = [
  ['Nike Air Runner', 'Nike', 'hommes', 129, '/images/sneaker-01-nike-campus-court.svg'],
  ['Nike Dunk Court', 'Nike', 'femmes', 119, '/images/sneaker-02-nike-fresh-foam.svg'],
  ['Jordan Retro High', 'Jordan', 'hommes', 179, '/images/sneaker-13-jordan-fresh-foam.svg'],
  ['Adidas Samba OG', 'Adidas', 'femmes', 109, '/images/sneaker-07-adidas-forum-move.svg'],
  ['Adidas Campus 00s', 'Adidas', 'hommes', 99, '/images/sneaker-09-adidas-campus-court.svg'],
  ['New Balance 550', 'New Balance', 'hommes', 139, '/images/sneaker-20-new-balance-campus-court.svg'],
  ['New Balance 9060', 'New Balance', 'femmes', 159, '/images/sneaker-21-new-balance-fresh-foam.svg'],
  ['Puma Suede Classic', 'Puma', 'hommes', 89, '/images/sneaker-25-puma-gel-pulse.svg'],
  ['ASICS Gel Lyte', 'ASICS', 'femmes', 125, '/images/sneaker-33-asics-gel-pulse.svg'],
  ['Converse Chuck 70', 'Converse', 'enfants', 75, '/images/kids-neon.svg']
];

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(MAPPING_DIR, { recursive: true });
}
function writeJson(file, value) {
  ensureDirs();
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}
function cleanString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).replace(/\s+/g, ' ').trim() || fallback;
}
function firstDefined(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return undefined;
}
function toNumber(value, fallback = 99) {
  const n = Number(String(value ?? '').replace(/[€$£,]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
function slugify(value) {
  return cleanString(value, 'sneaker')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
function hashToStock(seed) {
  let h = 0;
  for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 2 + (h % 12);
}
function detectBrand(text, fallback = 'SneakR') {
  const source = cleanString(text, '').toLowerCase();
  const brands = ['Nike', 'Jordan', 'Adidas', 'New Balance', 'Puma', 'ASICS', 'Converse', 'Vans', 'Reebok', 'Saucony'];
  return brands.find((b) => source.includes(b.toLowerCase())) || fallback;
}
function detectCategory(title) {
  const t = cleanString(title, '').toLowerCase();
  if (/\b(gs|grade school|kids|child|td|toddler|youth)\b/.test(t)) return 'enfants';
  if (/\b(wmns|women|womens|female|femme)\b/.test(t)) return 'femmes';
  return 'hommes';
}
function sizeRange(category) {
  if (category === 'enfants') return ['28', '29', '30', '31', '32', '33', '34', '35'];
  if (category === 'femmes') return ['36', '37', '38', '39', '40', '41'];
  return ['40', '41', '42', '43', '44', '45'];
}
function generateInternalVariants(productKey, category, price) {
  return sizeRange(category).map((size) => ({
    sku: `${slugify(productKey).toUpperCase()}-${size}`,
    size,
    stock: hashToStock(`${productKey}-${size}`),
    price: Number(price || 99)
  }));
}
function imageFromAny(item) {
  const candidates = [
    item.image,
    item.imageUrl,
    item.image_url,
    item.thumbnail,
    item.thumbnailUrl,
    item.main_picture_url,
    item.grid_picture_url,
    item.media?.imageUrl,
    item.media?.thumbUrl,
    item.picture,
    item.picture_url,
    item.images?.[0],
    item.images?.[0]?.src,
    item.images?.[0]?.url,
    item.image?.src,
    item.attributes?.image
  ];
  const found = candidates.find((v) => typeof v === 'string' && /^https?:\/\//i.test(v));
  if (found) return found;
  const protocolRelative = candidates.find((v) => typeof v === 'string' && v.startsWith('//'));
  return protocolRelative ? `https:${protocolRelative}` : null;
}
function priceFromAny(item) {
  return toNumber(firstDefined(
    item.retailPrice,
    item.retail_price,
    item.retail,
    item.msrp,
    item.price,
    item.lowestAsk,
    item.lowest_ask,
    item.market?.lowestAsk,
    item.prices?.retail,
    item.prices?.lowestAsk,
    item.variants?.[0]?.price
  ), 99);
}

function normalizeExternalProduct(item, sourceName, id) {
  const name = cleanString(firstDefined(
    item.title,
    item.name,
    item.productName,
    item.model_name,
    item.shoe,
    item.sneaker_name,
    item.attributes?.name,
    item.attributes?.title
  ), `Sneaker ${id}`);

  const brand = cleanString(firstDefined(
    item.brand,
    item.vendor,
    item.make,
    item.manufacturer,
    item.attributes?.brand,
    detectBrand(name)
  ), detectBrand(name));

  const image = imageFromAny(item);
  if (!image) return null;

  const category = detectCategory(`${name} ${item.gender || item.category || item.product_type || ''}`);
  const price = priceFromAny(item);
  const sku = cleanString(firstDefined(item.sku, item.styleId, item.style_id, item.id, item.uuid, item.productId), slugify(name));
  const colorway = cleanString(firstDefined(item.colorway, item.color, item.colors, item.metadata?.colorway), 'Coloris catalogue');
  const sourceUrl = cleanString(firstDefined(item.url, item.link, item.productUrl, item.product_url, item.web_url), '');

  return {
    id,
    brand,
    name,
    category,
    gender: category,
    price,
    originalPrice: Math.round(price * 1.18),
    image,
    description: `${name} importé depuis ${sourceName}. Les données catalogue alimentent la fiche produit ; notre backend gère ensuite les tailles et stocks internes.`,
    colorway,
    badge: '',
    featured: id <= 12,
    variants: generateInternalVariants(`${sku}-${name}`, category, price),
    mappedFrom: {
      source: sourceName,
      sourceType: sourceName.includes('KicksDB') ? 'api-key' : 'public-catalogue',
      externalProductId: cleanString(firstDefined(item.id, item.uuid, item.productId, item.sku), ''),
      productUrl: sourceUrl,
      importedAt: new Date().toISOString(),
      stockNote: 'Le stock exact par taille est simulé et géré en interne par le backend.'
    }
  };
}

function normalizeKicksDBItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

async function importFromKicksDB(targetCount, audit) {
  const key = process.env.KICKSDB_API_KEY;
  if (!key) {
    audit.warnings.push('KicksDB non configuré : aucune clé dans .env.');
    return [];
  }

  const mapped = [];
  for (const query of QUERIES) {
    if (mapped.length >= targetCount) break;
    const url = `https://api.kicks.dev/v3/stockx/products?query=${encodeURIComponent(query)}&limit=20`;
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${key}`,
          'x-api-key': key,
          Accept: 'application/json'
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const raw = normalizeKicksDBItems(data);
      let accepted = 0;
      for (const item of raw) {
        if (mapped.length >= targetCount) break;
        const product = normalizeExternalProduct(item, 'KicksDB API', mapped.length + 1);
        if (!product) continue;
        mapped.push(product);
        accepted++;
      }
      audit.sources.push({ name: 'KicksDB API', query, fetched: raw.length, accepted });
    } catch (error) {
      audit.sources.push({ name: 'KicksDB API', query, error: error.message });
      audit.warnings.push(`KicksDB ${query}: ${error.message}`);
    }
  }
  return mapped;
}

async function importFromShopify(targetCount, audit, currentCount = 0) {
  const mapped = [];
  for (const source of SHOPIFY_SOURCES) {
    if (mapped.length + currentCount >= targetCount) break;
    try {
      const response = await fetch(source.url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const products = Array.isArray(data?.products) ? data.products : [];
      let accepted = 0;
      for (const item of products) {
        if (mapped.length + currentCount >= targetCount) break;
        const image = item.images?.[0]?.src || item.image?.src;
        const productUrl = item.handle ? `${source.baseUrl}/products/${item.handle}` : source.baseUrl;
        const normalized = normalizeExternalProduct({
          ...item,
          image,
          url: productUrl,
          price: item.variants?.[0]?.price,
          vendor: item.vendor,
          product_type: item.product_type
        }, source.name, currentCount + mapped.length + 1);
        if (!normalized) continue;
        mapped.push(normalized);
        accepted++;
      }
      audit.sources.push({ name: source.name, endpoint: source.url, fetched: products.length, accepted });
    } catch (error) {
      audit.sources.push({ name: source.name, endpoint: source.url, error: error.message });
      audit.warnings.push(`${source.name}: ${error.message}`);
    }
  }
  return mapped;
}

function importFromLocalBackup(targetCount, audit, currentCount = 0) {
  const mapped = [];
  let i = 0;
  while (mapped.length + currentCount < targetCount) {
    const base = LOCAL_BACKUP[i % LOCAL_BACKUP.length];
    const id = currentCount + mapped.length + 1;
    const [baseName, brand, category, price, image] = base;
    const name = `${baseName} ${100 + id}`;
    mapped.push({
      id,
      brand,
      name,
      category,
      gender: category,
      price,
      originalPrice: Math.round(price * 1.15),
      image,
      description: `${name} - fiche produit de secours utilisée si les catalogues externes ne répondent pas pendant la démo.`,
      colorway: ['Black/White', 'Cream/Green', 'Grey/Navy', 'Red/Black'][id % 4],
      badge: 'Catalogue interne',
      featured: id <= 12,
      variants: generateInternalVariants(`${brand}-${name}-${id}`, category, price),
      mappedFrom: {
        source: 'Catalogue de secours local',
        sourceType: 'local-fallback',
        externalProductId: `LOCAL-${id}`,
        productUrl: '',
        importedAt: new Date().toISOString(),
        stockNote: 'Catalogue de secours uniquement utilisé si Internet/API indisponible.'
      }
    });
    i++;
  }
  audit.sources.push({ name: 'Catalogue de secours local', fetched: mapped.length, accepted: mapped.length });
  return mapped;
}

async function importWebMapping({ targetCount = TARGET_DEFAULT } = {}) {
  ensureDirs();
  const audit = {
    mode: 'catalogue-import',
    targetCount,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    sources: [],
    warnings: []
  };

  let products = [];

  const apiProducts = await importFromKicksDB(targetCount, audit);
  products = apiProducts;

  if (products.length < targetCount) {
    const publicProducts = await importFromShopify(targetCount, audit, products.length);
    products = products.concat(publicProducts);
  }

  if (products.length < targetCount) {
    const localProducts = importFromLocalBackup(targetCount, audit, products.length);
    products = products.concat(localProducts);
  }

  products = products.slice(0, targetCount).map((product, index) => ({ ...product, id: index + 1 }));
  const apiCount = products.filter((p) => p.mappedFrom?.sourceType === 'api-key').length;
  const publicCount = products.filter((p) => p.mappedFrom?.sourceType === 'public-catalogue').length;
  const localCount = products.filter((p) => p.mappedFrom?.sourceType === 'local-fallback').length;

  audit.mode = apiCount > 0 ? 'kicksdb-api-plus-fallback' : publicCount > 0 ? 'public-catalogues' : 'local-fallback';
  audit.imported = products.length;
  audit.counts = { apiCount, publicCount, localCount };
  audit.finishedAt = new Date().toISOString();

  writeJson(PRODUCTS_FILE, products);
  writeJson(MAPPING_AUDIT_FILE, audit);

  return { products, audit };
}

if (require.main === module) {
  importWebMapping()
    .then(({ products, audit }) => {
      console.log(`Import catalogue terminé : ${audit.imported} produits actifs.`);
      console.log(`Mode: ${audit.mode}`);
      if (audit.counts) console.log(`Détail: API=${audit.counts.apiCount}, publics=${audit.counts.publicCount}, local=${audit.counts.localCount}`);
      if (audit.warnings.length) console.log(`Warnings: ${audit.warnings.join(' | ')}`);
    })
    .catch((error) => {
      console.error('Erreur import catalogue:', error);
      process.exit(1);
    });
}

module.exports = { importWebMapping, SOURCES };
