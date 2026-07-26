/* Controle Fácil – PWA (v0.2)
   Offline-first com IndexedDB, rotas simples por hash e carrossel segmentado.
   v0.2.1: Leitor de código por câmera (BarcodeDetector) + cadastro assistido com fotos frente/verso.
*/
'use strict';

const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

/* ---------- Utils ---------- */
const money = {
  parse(pt){ // "1.234,56" -> 1234.56
    if(pt == null) return 0;
    const s = String(pt).trim();
    if(!s) return 0;
    const norm = s.replace(/\./g,'').replace(',', '.').replace(/[^\d.-]/g,'');
    const v = Number(norm);
    return Number.isFinite(v) ? v : 0;
  },
  fmt(n){
    const v = Number(n||0);
    return v.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
  }
};

function uid(prefix='id'){
  return prefix + '_' + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function toast(title, msg){
  const t = $('#toast');
  $('#toastTitle').textContent = title;
  $('#toastMsg').textContent = msg || '';
  t.classList.add('show');
  clearTimeout(toast._tm);
  toast._tm = setTimeout(()=>t.classList.remove('show'), 3200);
}

/* ---------- Device ---------- */
const device = (() => {
  const isDesktop = matchMedia('(min-width: 860px)').matches;
  return { type: isDesktop ? 'desktop' : 'mobile' };
})();

/* ---------- IndexedDB Wrapper ---------- */
const DB_NAME = 'controle_facil_v01';
const DB_VER = 1;
const STORES = {
  settings: 'settings',
  products: 'products',
  customers: 'customers',
  sales: 'sales',
  accounts: 'accounts',
  ads: 'ads'
};

const db = {
  _db: null,
  async open(){
    if(this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = () => {
        const d = req.result;
        if(!d.objectStoreNames.contains(STORES.settings)) d.createObjectStore(STORES.settings, {keyPath:'key'});
        if(!d.objectStoreNames.contains(STORES.products)) d.createObjectStore(STORES.products, {keyPath:'id'});
        if(!d.objectStoreNames.contains(STORES.customers)) d.createObjectStore(STORES.customers, {keyPath:'id'});
        if(!d.objectStoreNames.contains(STORES.sales)) d.createObjectStore(STORES.sales, {keyPath:'id'});
        if(!d.objectStoreNames.contains(STORES.accounts)) d.createObjectStore(STORES.accounts, {keyPath:'id'});
        if(!d.objectStoreNames.contains(STORES.ads)) d.createObjectStore(STORES.ads, {keyPath:'id'});
      };
      req.onsuccess = () => resolve(this._db = req.result);
      req.onerror = () => reject(req.error);
    });
  },
  async tx(store, mode='readonly'){
    const d = await this.open();
    return d.transaction(store, mode).objectStore(store);
  },
  async get(store, key){
    const os = await this.tx(store);
    return new Promise((res, rej) => {
      const r = os.get(key);
      r.onsuccess = ()=>res(r.result || null);
      r.onerror = ()=>rej(r.error);
    });
  },
  async put(store, val){
    const os = await this.tx(store, 'readwrite');
    return new Promise((res, rej) => {
      const r = os.put(val);
      r.onsuccess = ()=>res(val);
      r.onerror = ()=>rej(r.error);
    });
  },
  async del(store, key){
    const os = await this.tx(store, 'readwrite');
    return new Promise((res, rej) => {
      const r = os.delete(key);
      r.onsuccess = ()=>res(true);
      r.onerror = ()=>rej(r.error);
    });
  },
  async all(store){
    const os = await this.tx(store);
    return new Promise((res, rej) => {
      const r = os.getAll();
      r.onsuccess = ()=>res(r.result || []);
      r.onerror = ()=>rej(r.error);
    });
  }
};

/* ---------- Camera helpers (foto/código) ---------- */
let productDraftPhotos = { front: null, back: null }; // {type, dataUrl}

function canUseCamera(){
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

async function waitVideoReady(video){
  if(video.readyState >= 2) return;
  await new Promise((res)=>{
    const on = ()=>{ video.removeEventListener('loadedmetadata', on); res(); };
    video.addEventListener('loadedmetadata', on, {once:true});
  });
}

function makeOverlay(html){
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:60;display:grid;place-items:center;padding:16px;';
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  return wrap;
}

async function capturePhotoOnce({title='Capturar foto', hint='Centralize e clique em Capturar'}={}){
  if(!canUseCamera()){
    toast('Câmera indisponível', 'Use o arquivo (galeria) ou leitor Bluetooth.');
    return null;
  }

  let stream = null;
  let done = false;

  const wrap = makeOverlay(`
    <div style="width:min(560px,100%);background:rgba(15,27,49,.98);border:1px solid rgba(255,255,255,.12);border-radius:18px;overflow:hidden">
      <div style="padding:10px 12px;display:flex;justify-content:space-between;align-items:center;color:#e5e7eb">
        <b>${escapeHtml(title)}</b>
        <button id="capClose" class="btn" type="button" style="padding:10px 12px">Fechar</button>
      </div>
      <div style="position:relative;aspect-ratio: 16/10;background:#000">
        <video id="capVideo" autoplay playsinline muted style="width:100%;height:100%;object-fit:cover"></video>
        <div style="position:absolute;inset:16px;border:2px dashed rgba(20,184,166,.7);border-radius:18px"></div>
      </div>
      <div style="padding:10px 12px;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap">
        <div style="color:#98a2b3;font-size:12px">${escapeHtml(hint)}</div>
        <div style="display:flex;gap:8px">
          <button id="capBtn" class="btn primary" type="button">Capturar</button>
        </div>
      </div>
    </div>
  `);

  const video = $('#capVideo', wrap);
  const closeBtn = $('#capClose', wrap);
  const capBtn = $('#capBtn', wrap);

  const cleanup = ()=>{
    try{ stream?.getTracks()?.forEach(t=>t.stop()); }catch(_){ }
    wrap.remove();
  };

  const result = await new Promise(async (resolve) => {
    closeBtn.addEventListener('click', ()=>{ done=true; cleanup(); resolve(null); });
    capBtn.addEventListener('click', ()=>{
      if(done) return;
      done = true;
      try{
        const canvas = document.createElement('canvas');
        const w = video.videoWidth || 1280;
        const h = video.videoHeight || 720;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        cleanup();
        resolve({type:'image/jpeg', dataUrl});
      }catch(err){
        console.error(err);
        cleanup();
        resolve(null);
      }
    });

    try{
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      video.srcObject = stream;
      await waitVideoReady(video);
      try{ await video.play(); }catch(_){ }
    }catch(err){
      console.error(err);
      cleanup();
      toast('Câmera bloqueada', 'Permita acesso à câmera no navegador.');
      resolve(null);
    }
  });

  return result;
}

function ensureProductPhotoUI(){
  const host = $('#productPhotoTools');
  if(host) return; // já existe

  const form = $('#productForm');
  if(!form) return;

  const box = document.createElement('div');
  box.id = 'productPhotoTools';
  box.style.cssText = 'margin-top:10px;display:grid;gap:10px;';
  box.innerHTML = `
    <div class="row" style="gap:10px;flex-wrap:wrap">
      <button id="btnCapFront" class="btn" type="button">📷 Capturar FRENTE</button>
      <button id="btnCapBack" class="btn" type="button">📷 Capturar VERSO</button>
      <span class="chip" style="opacity:.9">Dica: no celular, também pode usar os campos de arquivo (frente/verso).</span>
    </div>
    <div class="row" style="gap:10px;align-items:flex-start;flex-wrap:wrap">
      <div style="min-width:140px">
        <div style="font-size:12px;color:#98a2b3;margin-bottom:6px">Prévia frente</div>
        <img id="prevFront" alt="frente" style="width:140px;height:100px;object-fit:cover;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:#0b1220" />
      </div>
      <div style="min-width:140px">
        <div style="font-size:12px;color:#98a2b3;margin-bottom:6px">Prévia verso</div>
        <img id="prevBack" alt="verso" style="width:140px;height:100px;object-fit:cover;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:#0b1220" />
      </div>
    </div>
  `;

  form.appendChild(box);

  const prevF = $('#prevFront');
  const prevB = $('#prevBack');
  const refresh = ()=>{
    prevF.src = productDraftPhotos.front?.dataUrl || '';
    prevB.src = productDraftPhotos.back?.dataUrl || '';
  };

  $('#btnCapFront').addEventListener('click', async ()=>{
    const img = await capturePhotoOnce({title:'Foto da FRENTE', hint:'Centralize a embalagem (frente) e clique em Capturar.'});
    if(img){ productDraftPhotos.front = img; refresh(); toast('Foto salva','Frente capturada.'); }
  });

  $('#btnCapBack').addEventListener('click', async ()=>{
    const img = await capturePhotoOnce({title:'Foto do VERSO', hint:'Centralize a embalagem (verso/ingredientes) e clique em Capturar.'});
    if(img){ productDraftPhotos.back = img; refresh(); toast('Foto salva','Verso capturado.'); }
  });

  refresh();
}

/* ---------- Settings ---------- */
const settings = {
  async get(key, fallback=null){
    const row = await db.get(STORES.settings, key);
    return row ? row.value : fallback;
  },
  async set(key, value){
    return db.put(STORES.settings, {key, value});
  }
};

/* ---------- Router ---------- */
const routes = {
  '#/': 'home',
  '#/vender': 'vender',
  '#/estoque': 'estoque',
  '#/contas': 'contas',
  '#/fiado': 'fiado',
  '#/relatorios': 'relatorios',
  '#/dashboard': 'dashboard',
  '#/cadastro': 'cadastro',
  '#/admin': 'admin'
};

function showView(key){
  const viewId = 'view-' + key;
  $$('.view').forEach(v => v.classList.toggle('active', v.id === viewId));
}

function navigate(hash){
  location.hash = hash;
}

function onRoute(){
  const h = location.hash || '#/';
  const key = routes[h] || 'home';
  showView(key);
  // refresh view data
  if(key === 'estoque') renderStock();
  if(key === 'fiado') renderFiado();
  if(key === 'dashboard') renderDash();
  if(key === 'contas') renderAccounts();
  if(key === 'admin') renderAdsTable();
}

/* ---------- Net status ---------- */
function renderNet(){
  const on = navigator.onLine;
  $('#netText').textContent = on ? 'online' : 'offline';
  $('#netDot').style.background = on ? '#22c55e' : '#ef4444';
}
window.addEventListener('online', renderNet);
window.addEventListener('offline', renderNet);

/* ---------- Carrossel (Ads) ---------- */
const carousel = {
  idx: 0,
  tm: null,
  async getContext(){
    const city = await settings.get('city', 'Valente');
    const bairro = await settings.get('bairro', '');
    return {city, bairro, hour: new Date().getHours(), device: device.type};
  },
  async pickAds(){
    const ctx = await this.getContext();
    const ads = (await db.all(STORES.ads)).filter(a => a.active !== false);
    const filtered = ads.filter(a => {
      const devOk = (a.device === 'both') || (a.device === ctx.device);
      const cityOk = !a.city || a.city.toLowerCase() === ctx.city.toLowerCase();
      const bairroOk = !a.bairro || a.bairro.toLowerCase() === ctx.bairro.toLowerCase();
      const hs = Number.isFinite(+a.hourStart) ? +a.hourStart : 0;
      const he = Number.isFinite(+a.hourEnd) ? +a.hourEnd : 23;
      const hourOk = (ctx.hour >= hs) && (ctx.hour <= he);
      return devOk && cityOk && bairroOk && hourOk;
    });

    // regra: mostrar 3 por tela (ou menos se não tiver)
    return filtered.slice(0, 3);
  },
  async render(){
    const inner = $('#carouselInner');
    const dots = $('#carouselDots');
    const items = await this.pickAds();

    // fallback default
    const defaults = [
      {title:'Atacadista parceiro', subtitle:'Condições especiais hoje', type:'image', mediaUrl:'', link:''},
      {title:'Dica de gestão', subtitle:'Reponha o que mais gira', type:'image', mediaUrl:'', link:''},
      {title:'Controle Fácil', subtitle:'Seu estoque no celular', type:'image', mediaUrl:'', link:''},
    ];
    const list = items.length ? items : defaults;

    inner.innerHTML = '';
    dots.innerHTML = '';
    list.forEach((ad, i) => {
      const slide = document.createElement('div');
      slide.className = 'slide';
      slide.tabIndex = 0;

      const media = document.createElement('div');
      media.className = 'slideMedia';

      if(ad.mediaUrl){
        if(ad.type === 'video'){
          const v = document.createElement('video');
          v.src = ad.mediaUrl;
          v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
          media.appendChild(v);
        }else{
          const img = document.createElement('img');
          img.src = ad.mediaUrl;
          img.alt = ad.title || 'Propaganda';
          media.appendChild(img);
        }
      } else {
        // visual placeholder
        const ph = document.createElement('div');
        ph.style.cssText = 'position:absolute;inset:0;background:radial-gradient(circle at 20% 20%, rgba(20,184,166,.35), transparent 55%), radial-gradient(circle at 80% 70%, rgba(34,197,94,.22), transparent 50%), linear-gradient(90deg, rgba(15,27,49,.7), rgba(15,27,49,.35));';
        media.appendChild(ph);
      }

      const overlay = document.createElement('div');
      overlay.className = 'slideOverlay';

      const text = document.createElement('div');
      text.className = 'slideText';
      text.innerHTML = `<b>${escapeHtml(ad.title||'') || 'Propaganda'}</b><small>${escapeHtml(ad.subtitle||'') || 'Espaço para parceiros'}</small>`;

      slide.appendChild(media);
      slide.appendChild(overlay);
      slide.appendChild(text);

      if(ad.link){
        slide.style.cursor = 'pointer';
        slide.addEventListener('click', () => window.open(ad.link, '_blank'));
      }

      inner.appendChild(slide);

      const d = document.createElement('span');
      if(i===0) d.classList.add('active');
      dots.appendChild(d);
    });

    this.idx = 0;
    this.update();
    this.start();
  },
  update(){
    const inner = $('#carouselInner');
    const dots = $$('#carouselDots span');
    inner.style.transform = `translateX(-${this.idx*100}%)`;
    dots.forEach((d,i)=>d.classList.toggle('active', i===this.idx));
  },
  start(){
    clearInterval(this.tm);
    this.tm = setInterval(()=>{
      const slides = $$('#carouselInner .slide');
      if(slides.length <= 1) return;
      this.idx = (this.idx + 1) % slides.length;
      this.update();
    }, 5200);
  }
};

function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ---------- Data models ---------- */
async function seedIfEmpty(){
  const exists = await settings.get('seeded', false);
  if(exists) return;
  await settings.set('storeName', 'Piloto');
  await settings.set('plan', 'free');
  await settings.set('city', 'Valente');
  await settings.set('bairro', '');
  await settings.set('pricePerHour', 5);

  // demo products
  const demo = [
    {ean:'7891000100100', name:'Arroz 1kg', cat:'Mercearia', qty:10, price:7.99, cost:6.10, status:'ativo'},
    {ean:'7891000200200', name:'Feijão 1kg', cat:'Mercearia', qty:12, price:8.49, cost:6.80, status:'ativo'},
    {ean:'7891000300300', name:'Óleo 900ml', cat:'Mercearia', qty:8, price:9.99, cost:8.20, status:'ativo'},
  ];
  for(const p of demo){
    await upsertProduct(fromFormProduct(p));
  }

  // demo customers
  const c1 = {id:uid('c'), name:'Cliente Genérico', wp:'', cell:'', cpf:'', email:'', limit:0, due:'', saldo:0};
  await db.put(STORES.customers, c1);

  await settings.set('seeded', true);
}

/* ---------- UI init ---------- */
async function init(){
  renderNet();
  await db.open();
  await seedIfEmpty();

  // chips
  $('#deviceChip').textContent = 'Dispositivo: ' + (device.type==='desktop' ? 'Notebook' : 'Celular');
  $('#storeChip').textContent = 'Loja: ' + (await settings.get('storeName','Piloto'));
  $('#planChip').textContent = 'Plano: ' + (await settings.get('plan','free')).toUpperCase();

  // nav buttons
  $$('[data-nav]').forEach(b => b.addEventListener('click', () => navigate(b.getAttribute('data-nav'))));

  // router
  window.addEventListener('hashchange', onRoute);
  onRoute();

  // carrossel
  await carousel.render();
  setInterval(()=>carousel.render(), 60_000); // recarrega a cada 1 min (pega hora nova)

  // venda
  await renderCustomerSelect();
  $('#scanInput').addEventListener('keydown', async (e)=>{
    if(e.key === 'Enter'){
      const code = $('#scanInput').value.trim();
      $('#scanInput').value = '';
      if(code) await addToSaleByEan(code);
    }
  });
  $('#btnScanCam').addEventListener('click', scanByCamera);
  $('#btnCheckout').addEventListener('click', checkoutSale);
  $('#btnClearSale').addEventListener('click', clearSale);
  $('#btnQuickCustomer').addEventListener('click', quickCustomer);

  ['payCash','payPix','payCard','payFiado'].forEach(id => {
    $('#'+id).addEventListener('input', refreshPay);
  });

  // estoque
  $('#stockSearch').addEventListener('input', renderStock);
  $('#btnNewProduct').addEventListener('click', ()=>editProduct(null));
  $('#btnSaveProduct').addEventListener('click', saveProductFromForm);
  $('#btnDeleteProduct').addEventListener('click', deleteProductFromForm);
  $('#btnClearProduct').addEventListener('click', ()=>editProduct(null));

  // contas
  $('#btnSaveAcc').addEventListener('click', saveAccount);

  // fiado
  $('#btnNewFiadoCustomer').addEventListener('click', ()=>editCustomer(null));
  $('#btnSaveCustomer').addEventListener('click', saveCustomer);
  $('#btnClearCustomer').addEventListener('click', ()=>editCustomer(null));
  $('#btnSendWp').addEventListener('click', sendWp);

  // relatórios
  $('#btnExportSales').addEventListener('click', ()=>exportCsv('sales'));
  $('#btnExportStock').addEventListener('click', ()=>exportCsv('products'));
  $('#btnExportFiado').addEventListener('click', ()=>exportCsv('customers'));
  $('#btnExportAccounts').addEventListener('click', ()=>exportCsv('accounts'));

  // admin
  $('#btnSetPlan').addEventListener('click', async ()=>{
    const v = $('#planSelect').value;
    await settings.set('plan', v);
    $('#planChip').textContent = 'Plano: ' + v.toUpperCase();
    toast('Plano aplicado', v.toUpperCase());
  });
  $('#btnSavePrice').addEventListener('click', async ()=>{
    await settings.set('pricePerHour', money.parse($('#pricePerHour').value));
    toast('Preço por hora salvo', '');
  });
  $('#btnSaveAd').addEventListener('click', saveAd);
  $('#btnSeedDemo').addEventListener('click', async ()=>{
    await settings.set('seeded', false);
    location.reload();
  });

  // default admin fields
  $('#pricePerHour').value = String(await settings.get('pricePerHour', 5)).replace('.',',');

  // first renders
  await renderStock();
  await renderFiado();
  await renderDash();
  await renderAccounts();
  await renderAdsTable();
}
document.addEventListener('DOMContentLoaded', init);

/* ---------- Products ---------- */
function fromFormProduct(p){
  return {
    id: p.id || uid('p'),
    ean: String(p.ean||'').trim(),
    name: String(p.name||'').trim(),
    cat: String(p.cat||'').trim(),
    qty: Number(p.qty||0),
    price: Number(p.price||0),
    cost: Number(p.cost||0),
    status: p.status || 'ativo',
    front: p.front || null, // {name, type, dataUrl}
    back: p.back || null,
    createdAt: p.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function upsertProduct(p){
  // unique by ean if exists
  if(p.ean){
    const all = await db.all(STORES.products);
    const existing = all.find(x => x.ean === p.ean);
    if(existing && existing.id !== p.id){
      p.id = existing.id;
    }
  }
  await db.put(STORES.products, p);
  return p;
}

async function renderStock(){
  const q = $('#stockSearch').value.trim().toLowerCase();
  const rows = await db.all(STORES.products);
  const list = rows
    .filter(p => {
      if(!q) return true;
      return (p.name||'').toLowerCase().includes(q) || (p.ean||'').includes(q) || (p.id||'').toLowerCase().includes(q);
    })
    .sort((a,b)=>(a.name||'').localeCompare(b.name||''));

  $('#stockCountChip').textContent = `${list.length} itens`;
  const tb = $('#stockTable tbody');
  tb.innerHTML = '';
  for(const p of list){
    const tr = document.createElement('tr');
    tr.className = 'tr';
    tr.innerHTML = `
      <td>${escapeHtml(p.name||'')}</td>
      <td>${escapeHtml(p.ean||'')}</td>
      <td>${Number(p.qty||0)}</td>
      <td>${money.fmt(p.price||0)}</td>
      <td><button class="btn" type="button" data-id="${p.id}">Editar</button></td>
    `;
    $('button', tr).addEventListener('click', ()=>editProduct(p.id));
    tb.appendChild(tr);
  }
}

async function editProduct(id){
  const p = id ? await db.get(STORES.products, id) : null;
  // reset rascunho de fotos (usado no cadastro assistido)
  productDraftPhotos = { front: p?.front ? {type: p.front.type||'image/*', dataUrl: p.front.dataUrl} : null,
                        back:  p?.back  ? {type: p.back.type||'image/*',  dataUrl: p.back.dataUrl}  : null };
  $('#pEan').value = p?.ean || '';
  $('#pName').value = p?.name || '';
  $('#pCat').value = p?.cat || '';
  $('#pQty').value = p ? String(p.qty ?? 0) : '0';
  $('#pPrice').value = p ? String(p.price ?? 0).replace('.',',') : '0,00';
  $('#pCost').value = p ? String(p.cost ?? 0).replace('.',',') : '0,00';
  $('#pStatus').value = p?.status || 'ativo';
  $('#pFront').value = '';
  $('#pBack').value = '';
  $('#btnDeleteProduct').dataset.id = p?.id || '';
  $('#btnSaveProduct').dataset.id = p?.id || '';

  // injeta botões de captura e prévias (uma vez)
  ensureProductPhotoUI();
}

async function fileToDataUrl(file){
  if(!file) return null;
  const buf = await file.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return `data:${file.type};base64,${b64}`;
}

async function saveProductFromForm(){
  const id = $('#btnSaveProduct').dataset.id || null;
  const frontFile = $('#pFront').files?.[0] || null;
  const backFile  = $('#pBack').files?.[0] || null;
  const existing = id ? await db.get(STORES.products, id) : null;

  const frontFromDraft = (!frontFile && productDraftPhotos.front?.dataUrl)
    ? {name:'frente.jpg', type: productDraftPhotos.front.type || 'image/jpeg', dataUrl: productDraftPhotos.front.dataUrl}
    : null;
  const backFromDraft = (!backFile && productDraftPhotos.back?.dataUrl)
    ? {name:'verso.jpg', type: productDraftPhotos.back.type || 'image/jpeg', dataUrl: productDraftPhotos.back.dataUrl}
    : null;

  const p = fromFormProduct({
    id: id || undefined,
    ean: $('#pEan').value,
    name: $('#pName').value,
    cat: $('#pCat').value,
    qty: money.parse($('#pQty').value),
    price: money.parse($('#pPrice').value),
    cost: money.parse($('#pCost').value),
    status: $('#pStatus').value,
    front: frontFile ? {name:frontFile.name,type:frontFile.type,dataUrl: await fileToDataUrl(frontFile)} : (frontFromDraft || existing?.front || null),
    back: backFile ? {name:backFile.name,type:backFile.type,dataUrl: await fileToDataUrl(backFile)} : (backFromDraft || existing?.back || null),
    createdAt: existing?.createdAt
  });

  await upsertProduct(p);
  toast('Produto salvo', p.name);
  await renderStock();
  editProduct(p.id);
}

async function deleteProductFromForm(){
  const id = $('#btnDeleteProduct').dataset.id;
  if(!id){ toast('Nada para excluir',''); return; }
  await db.del(STORES.products, id);
  toast('Produto excluído','');
  await renderStock();
  editProduct(null);
}

/* ---------- Customers (Fiado) ---------- */
let currentCustomerId = null;

async function renderCustomerSelect(){
  const list = await db.all(STORES.customers);
  const sel = $('#saleCustomer');
  sel.innerHTML = '';
  for(const c of list.sort((a,b)=>(a.name||'').localeCompare(b.name||''))){
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name || 'Cliente';
    sel.appendChild(opt);
  }
}

function customerFromForm(c){
  return {
    id: c.id || uid('c'),
    name: String(c.name||'').trim(),
    wp: String(c.wp||'').trim(),
    cell: String(c.cell||'').trim(),
    cpf: String(c.cpf||'').trim(),
    email: String(c.email||'').trim(),
    limit: Number(c.limit||0),
    due: c.due || '',
    saldo: Number(c.saldo||0),
    updatedAt: new Date().toISOString(),
    createdAt: c.createdAt || new Date().toISOString()
  };
}

async function renderFiado(){
  const list = await db.all(STORES.customers);
  const today = new Date().toISOString().slice(0,10);
  const vencidos = list.filter(c => c.due && c.due < today && (c.saldo||0) > 0);
  $('#fiadoAlertChip').textContent = `${vencidos.length} vencidos`;

  const tb = $('#fiadoTable tbody');
  tb.innerHTML = '';
  for(const c of list.filter(x=>x.name !== 'Cliente Genérico').sort((a,b)=>(a.name||'').localeCompare(b.name||''))){
    const tr = document.createElement('tr');
    tr.className = 'tr';
    tr.innerHTML = `
      <td>${escapeHtml(c.name||'')}</td>
      <td>${money.fmt(c.limit||0)}</td>
      <td>${money.fmt(c.saldo||0)}</td>
      <td>${escapeHtml(c.due||'')}</td>
    `;
    tr.style.cursor = 'pointer';
    tr.addEventListener('click', ()=>editCustomer(c.id));
    tb.appendChild(tr);
  }
}

async function editCustomer(id){
  const c = id ? await db.get(STORES.customers, id) : null;
  currentCustomerId = c?.id || null;
  $('#cName').value = c?.name || '';
  $('#cWp').value = c?.wp || '';
  $('#cCell').value = c?.cell || '';
  $('#cCpf').value = c?.cpf || '';
  $('#cEmail').value = c?.email || '';
  $('#cLimit').value = (c ? String(c.limit||0).replace('.',',') : '0,00');
  $('#cDue').value = c?.due || '';
}

async function saveCustomer(){
  const existing = currentCustomerId ? await db.get(STORES.customers, currentCustomerId) : null;
  const c = customerFromForm({
    id: currentCustomerId || undefined,
    name: $('#cName').value,
    wp: $('#cWp').value,
    cell: $('#cCell').value,
    cpf: $('#cCpf').value,
    email: $('#cEmail').value,
    limit: money.parse($('#cLimit').value),
    due: $('#cDue').value,
    saldo: existing?.saldo || 0,
    createdAt: existing?.createdAt
  });
  await db.put(STORES.customers, c);
  toast('Cliente salvo', c.name);
  await renderFiado();
  await renderCustomerSelect();
  currentCustomerId = c.id;
}

function sendWp(){
  const name = $('#cName').value.trim();
  const wp = ($('#cWp').value || '').replace(/\D/g,'');
  const limit = $('#cLimit').value.trim();
  if(!wp){ toast('WhatsApp vazio','Informe o número'); return; }
  const msg = encodeURIComponent(`Cliente cadastrado com sucesso! Saldo para compra: R$${limit || '0,00'}`);
  window.open(`https://wa.me/55${wp}?text=${msg}`, '_blank');
}

/* ---------- Sale flow ---------- */
let sale = {
  id: null,
  items: [], // {productId, ean, name, qty, price}
  customerId: null
};

function clearSale(){
  sale = {id:null, items:[], customerId: null};
  $('#saleTable tbody').innerHTML = '';
  $('#saleTotalChip').textContent = 'Total: R$ 0,00';
  ['payCash','payPix','payCard','payFiado'].forEach(id => $('#'+id).value = '');
  refreshPay();
}

async function quickCustomer(){
  const name = prompt('Nome do cliente:');
  if(!name) return;
  const wp = prompt('WhatsApp (somente números ou com DDD):') || '';
  const c = customerFromForm({name, wp, cell:'', cpf:'', email:'', limit:0, due:'', saldo:0});
  await db.put(STORES.customers, c);
  await renderCustomerSelect();
  $('#saleCustomer').value = c.id;
  toast('Cliente cadastrado', name);
}

async function addToSaleByEan(ean){
  const products = await db.all(STORES.products);
  let p = products.find(x => x.ean === ean);
  if(!p){
    const ok = confirm('Produto não encontrado. Deseja cadastrar agora (frente/verso)?');
    if(!ok) return;
    await openAssistedProductCapture(ean);
    return;
  }

  // incrementa qty se já existe
  const found = sale.items.find(i => i.productId === p.id);
  if(found) found.qty += 1;
  else sale.items.push({productId:p.id, ean:p.ean, name:p.name, qty:1, price:p.price||0});

  renderSaleItems();
}

async function openAssistedProductCapture(ean){
  // abre o cadastro de produto e já solicita fotos frente/verso
  navigate('#/estoque');
  await editProduct(null);
  $('#pEan').value = ean || '';
  $('#pName').value = '';
  $('#pQty').value = '1';
  $('#pPrice').value = '0,00';
  $('#pCost').value = '0,00';
  $('#pCat').value = '';

  toast('Cadastro assistido', 'Vamos tirar 2 fotos (frente e verso).');

  // captura frente
  const f = await capturePhotoOnce({title:'Foto da FRENTE', hint:'Centralize a embalagem (frente) e clique em Capturar.'});
  if(f) productDraftPhotos.front = f;
  // captura verso
  const b = await capturePhotoOnce({title:'Foto do VERSO', hint:'Agora vire a embalagem (verso/ingredientes) e clique em Capturar.'});
  if(b) productDraftPhotos.back = b;

  // atualiza prévias se UI já existe
  try{
    const prevF = $('#prevFront');
    const prevB = $('#prevBack');
    if(prevF) prevF.src = productDraftPhotos.front?.dataUrl || '';
    if(prevB) prevB.src = productDraftPhotos.back?.dataUrl || '';
  }catch(_){ }

  if(!productDraftPhotos.front && !productDraftPhotos.back){
    toast('Sem fotos', 'Você pode anexar manualmente nos campos Frente/Verso.');
  }else{
    toast('Fotos prontas', 'Agora preencha nome, categoria e preços, e clique em Salvar.');
  }
}

function renderSaleItems(){
  const tb = $('#saleTable tbody');
  tb.innerHTML = '';
  for(const it of sale.items){
    const tr = document.createElement('tr');
    tr.className = 'tr';
    const subtotal = (it.qty||0) * (it.price||0);
    tr.innerHTML = `
      <td>${escapeHtml(it.name||'')}</td>
      <td>
        <div class="row" style="gap:6px;flex-wrap:nowrap">
          <button class="btn" type="button" data-act="dec">-</button>
          <span class="chip">${it.qty}</span>
          <button class="btn" type="button" data-act="inc">+</button>
        </div>
      </td>
      <td><input style="max-width:120px" value="${String(it.price||0).replace('.',',')}" inputmode="decimal"></td>
      <td>${money.fmt(subtotal)}</td>
      <td><button class="btn danger" type="button">Remover</button></td>
    `;
    const [dec, inc] = $$('button[data-act]', tr);
    const priceInput = $('input', tr);
    const removeBtn = $$('button', tr).slice(-1)[0];

    dec.addEventListener('click', ()=>{
      it.qty = Math.max(1, (it.qty||1) - 1);
      renderSaleItems();
    });
    inc.addEventListener('click', ()=>{
      it.qty = (it.qty||0) + 1;
      renderSaleItems();
    });
    priceInput.addEventListener('input', ()=>{
      it.price = money.parse(priceInput.value);
      refreshSaleTotal();
    });
    removeBtn.addEventListener('click', ()=>{
      sale.items = sale.items.filter(x => x !== it);
      renderSaleItems();
    });

    tb.appendChild(tr);
  }
  refreshSaleTotal();
}

function saleTotal(){
  return sale.items.reduce((s,it)=>s+(it.qty||0)*(it.price||0),0);
}

function refreshSaleTotal(){
  $('#saleTotalChip').textContent = 'Total: ' + money.fmt(saleTotal());
  refreshPay();
}

function refreshPay(){
  const total = saleTotal();
  const paid = money.parse($('#payCash').value) + money.parse($('#payPix').value) + money.parse($('#payCard').value) + money.parse($('#payFiado').value);
  $('#paySumChip').textContent = 'Pago: ' + money.fmt(paid);
  const change = Math.max(0, paid - total);
  $('#payChangeChip').textContent = 'Troco: ' + money.fmt(change);
}

async function checkoutSale(){
  if(!sale.items.length){
    toast('Venda vazia','Adicione itens primeiro.');
    return;
  }
  const total = saleTotal();
  const paid = money.parse($('#payCash').value) + money.parse($('#payPix').value) + money.parse($('#payCard').value) + money.parse($('#payFiado').value);
  if(paid + 0.0001 < total){
    toast('Pagamento insuficiente', 'Complete o pagamento.');
    return;
  }

  // atômico simplificado (sem transação multi-store real): tenta aplicar e, se falhar, aborta.
  const saleId = uid('s');
  const customerId = $('#saleCustomer').value || null;

  // 1) baixar estoque
  const products = await db.all(STORES.products);
  const updated = [];
  for(const it of sale.items){
    const p = products.find(x=>x.id===it.productId);
    if(!p) continue;
    const nextQty = (p.qty||0) - (it.qty||0);
    if(nextQty < 0){
      toast('Estoque insuficiente', p.name);
      return;
    }
    updated.push({...p, qty: nextQty, updatedAt: new Date().toISOString()});
  }

  // 2) se tiver fiado, atualizar saldo do cliente
  const fiadoVal = money.parse($('#payFiado').value);
  let custUpdate = null;
  if(fiadoVal > 0 && customerId){
    const c = await db.get(STORES.customers, customerId);
    if(c){
      const novoSaldo = (c.saldo||0) + fiadoVal;
      const limite = (c.limit||0);
      if(limite > 0 && novoSaldo > limite){
        toast('Limite de fiado alcançado', 'Ajuste o valor ou o limite.');
        return;
      }
      custUpdate = {...c, saldo: novoSaldo, updatedAt: new Date().toISOString()};
    }
  }

  // 3) gravar venda
  const rec = {
    id: saleId,
    createdAt: new Date().toISOString(),
    customerId: customerId,
    items: sale.items.map(x=>({productId:x.productId, ean:x.ean, name:x.name, qty:x.qty, price:x.price})),
    total,
    pay: {
      cash: money.parse($('#payCash').value),
      pix: money.parse($('#payPix').value),
      card: money.parse($('#payCard').value),
      fiado: fiadoVal
    },
    device: device.type
  };

  try{
    for(const p of updated) await db.put(STORES.products, p);
    if(custUpdate) await db.put(STORES.customers, custUpdate);
    await db.put(STORES.sales, rec);
    toast('Venda finalizada', money.fmt(total));
    clearSale();
    await renderStock();
    await renderFiado();
    await renderDash();
  }catch(err){
    console.error(err);
    toast('Erro ao salvar', 'Tente novamente.');
  }
}

/* ---------- Camera scanning ---------- */
async function scanByCamera(){
  // IMPORTANTE: leitura por câmera funciona melhor no Chrome/Safari (não em navegadores "dentro" do WhatsApp/Instagram).
  // Exija HTTPS (Vercel ok) e permissão de câmera liberada para o site.
  const Z = window.ZXingBrowser || window.ZXing; // @zxing/browser expõe ZXingBrowser (UMD); alguns bundlers expõem ZXing
  const hasZX = !!(Z && (Z.BrowserMultiFormatReader || Z.BrowserBarcodeReader));

  if(!hasZX){
    toast('Leitor não carregou', 'Atualize a página e tente novamente. Se persistir, use leitor Bluetooth ou digite o EAN.');
    return;
  }

  // UI
  $('scanStatus').textContent = 'Solicitando permissão da câmera...';
  scanModal.style.display = 'flex';
  const video = $('scanVideo');
  const btnTorch = $('btnTorch'); if(btnTorch){ btnTorch.style.display = 'none'; } // torch via ZXing depende do device; manteremos simples nesta versão
  let controls = null;
  let closed = false;

  const cleanup = ()=>{
    if(closed) return;
    closed = true;
    try{ if(controls && controls.stop) controls.stop(); }catch(e){}
    try{ video.srcObject = null; }catch(e){}
    scanModal.style.display = 'none';
    $('scanStatus').textContent = '';
  };

  $('btnScanClose').onclick = cleanup;

  // Se o usuário quiser cadastrar por foto manualmente
  $('btnScanAssist').onclick = ()=>{
    cleanup();
    openAssistedProductCapture();
  };

  try{
    const reader = new (Z.BrowserMultiFormatReader || Z.BrowserBarcodeReader)();

    // tenta escolher a câmera traseira
    let deviceId = undefined;
    try{
      const devices = await reader.listVideoInputDevices();
      if(devices && devices.length){
        const back = devices.find(d => /back|rear|trase|environment/i.test(d.label || ''));
        deviceId = (back || devices[0]).deviceId;
      }
    }catch(e){
      // ok: alguns browsers só liberam label depois de permitir câmera
    }

    $('scanStatus').textContent = 'Aponte para o código de barras (EAN)...';

    // decode contínuo; só fecha quando encontrar um código
    controls = await reader.decodeFromVideoDevice(deviceId, video, (result, err)=>{
      if(result){
        const code = (result.getText ? result.getText() : String(result.text || result)).trim();
        if(code){
          $('eanInput').value = code;
          cleanup();
          addToSaleByEan(code);
        }
      }
      // err é comum quando "não achou nada ainda" — ignorar silenciosamente
    });

    // garantia: se por algum motivo o vídeo não ficar "tocando", avisar
    setTimeout(()=>{
      if(!closed && (video.readyState < 2)){
        $('scanStatus').textContent = 'Se a imagem não aparecer, toque em "Cadastrar por foto" ou digite o EAN.';
      }
    }, 1200);

  }catch(err){
    console.error(err);
    toast('Falha ao iniciar leitor', String(err && err.message ? err.message : err));
    cleanup();
  }
}
function toCsv(rows){
  if(!rows.length) return '';
  const keys = Array.from(new Set(rows.flatMap(r=>Object.keys(r))));
  const esc = v => {
    const s = (v==null) ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
    return '"' + s.replace(/"/g,'""') + '"';
  };
  const lines = [];
  lines.push(keys.map(esc).join(','));
  for(const r of rows){
    lines.push(keys.map(k=>esc(r[k])).join(','));
  }
  return lines.join('\n');
}

/* ---------- Ads (Admin) ---------- */
async function saveAd(){
  const title = $('#adTitle').value.trim();
  const deviceSel = $('#adDevice').value;
  const city = $('#adCity').value.trim();
  const bairro = $('#adBairro').value.trim();
  const hourStart = parseInt($('#adHourStart').value||'0',10);
  const hourEnd = parseInt($('#adHourEnd').value||'23',10);
  const type = $('#adType').value;
  const link = $('#adLink').value.trim();
  const file = $('#adMedia').files?.[0] || null;

  if(!title){
    toast('Título obrigatório','');
    return;
  }

  let mediaUrl = '';
  let mediaMeta = null;
  if(file){
    mediaUrl = await fileToDataUrl(file);
    mediaMeta = {name:file.name, type:file.type, size:file.size};
  }

  const ad = {
    id: uid('ad'),
    title,
    subtitle: '',
    type: type === 'video' ? 'video' : 'image',
    mediaUrl,
    mediaMeta,
    link,
    device: deviceSel,
    city,
    bairro,
    hourStart: Number.isFinite(hourStart)?hourStart:0,
    hourEnd: Number.isFinite(hourEnd)?hourEnd:23,
    active: true,
    createdAt: new Date().toISOString()
  };

  await db.put(STORES.ads, ad);
  toast('Propaganda salva', title);
  $('#adTitle').value=''; $('#adMedia').value=''; $('#adLink').value='';
  await renderAdsTable();
  await carousel.render();
}

async function renderAdsTable(){
  const list = await db.all(STORES.ads);
  const tb = $('#adTable tbody');
  tb.innerHTML = '';
  for(const ad of list.sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))){
    const segm = `${ad.city||'*'}${ad.bairro?'/'+ad.bairro:''} • ${ad.device||'both'}`;
    const hr = `${ad.hourStart ?? 0}-${ad.hourEnd ?? 23}`;
    const tr = document.createElement('tr');
    tr.className = 'tr';
    tr.innerHTML = `
      <td>${escapeHtml(ad.title||'')}</td>
      <td>${escapeHtml(segm)}</td>
      <td>${escapeHtml(hr)}</td>
      <td><button class="btn danger" type="button">Remover</button></td>
    `;
    $('button', tr).addEventListener('click', async ()=>{
      await db.del(STORES.ads, ad.id);
      await renderAdsTable();
      await carousel.render();
      toast('Propaganda removida', ad.title);
    });
    tb.appendChild(tr);
  }
}

/* ---------- Service Worker register ---------- */
(async function registerSW(){
  if('serviceWorker' in navigator){
    try{
      await navigator.serviceWorker.register('./sw.js');
    }catch(err){
      console.warn('SW failed', err);
    }
  }
})();