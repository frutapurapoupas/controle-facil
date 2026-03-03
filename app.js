'use strict';

const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

/* ---------- Utils ---------- */
const money = {
  parse(pt){
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

function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ---------- Device ---------- */
const device = (() => {
  const isDesktop = matchMedia('(min-width: 860px)').matches;
  return { type: isDesktop ? 'desktop' : 'mobile' };
})();

/* ---------- IndexedDB ---------- */
const DB_NAME = 'controle_facil_v02';
const DB_VER = 2;
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
  '#/admin': 'admin'
};

function showView(key){
  const viewId = 'view-' + key;
  $$('.view').forEach(v => v.classList.toggle('active', v.id === viewId));
}

function navigate(hash){
  location.hash = hash;
}

async function onRoute(){
  const h = location.hash || '#/';
  const key = routes[h] || 'home';
  showView(key);

  if(key === 'estoque') await renderStock();
  if(key === 'fiado') await renderFiado();
  if(key === 'dashboard') await renderDash();
  if(key === 'contas') await renderAccounts();
  if(key === 'admin') await renderAdsTable();

  if(key === 'vender') await enterSale();
}

/* ---------- Net status ---------- */
function renderNet(){
  const on = navigator.onLine;
  $('#netText').textContent = on ? 'online' : 'offline';
  $('#netDot').style.background = on ? '#22c55e' : '#ef4444';
}
window.addEventListener('online', renderNet);
window.addEventListener('offline', renderNet);

/* ---------- Seed ---------- */
function productSkuFrom(ean){
  const base = (ean||'').replace(/\D/g,'').slice(-6);
  return 'SKU' + (base || Math.floor(Math.random()*999999).toString().padStart(6,'0'));
}

function fromFormProduct(p){
  return {
    id: p.id || uid('p'),
    ean: String(p.ean||'').trim(),
    sku: String(p.sku||'').trim() || productSkuFrom(p.ean),
    name: String(p.name||'').trim(),
    cat: String(p.cat||'').trim(),
    brand: String(p.brand||'').trim(),
    vendor: String(p.vendor||'').trim(),
    exp: p.exp || '',
    unit: p.unit || 'un',
    content: Number(p.content||0),
    qty: Number(p.qty||0),
    price: Number(p.price||0),
    cost: Number(p.cost||0),
    status: p.status || 'ativo',
    front: p.front || null,
    back: p.back || null,
    createdAt: p.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function upsertProduct(p){
  if(p.ean){
    const all = await db.all(STORES.products);
    const existing = all.find(x => x.ean === p.ean);
    if(existing && existing.id !== p.id) p.id = existing.id;
  }
  await db.put(STORES.products, p);
  return p;
}

async function seedIfEmpty(){
  const seeded = await settings.get('seeded', false);
  if(seeded) return;

  await settings.set('storeName', 'Piloto');
  await settings.set('plan', 'free');
  await settings.set('city', 'Valente');
  await settings.set('bairro', '');
  await settings.set('saleMode', 'advanced'); // padrão: avançado

  const demo = [
    {ean:'7891000100100', name:'Arroz 1kg', cat:'Mercearia', qty:10, price:7.99, cost:6.10, brand:'', vendor:'', exp:'', unit:'un', content:1},
    {ean:'7891000200200', name:'Feijão 1kg', cat:'Mercearia', qty:12, price:8.49, cost:6.80, brand:'', vendor:'', exp:'', unit:'un', content:1},
    {ean:'7891000300300', name:'Óleo 900ml', cat:'Mercearia', qty:8, price:9.99, cost:8.20, brand:'', vendor:'', exp:'', unit:'ml', content:900},
  ];
  for(const p of demo) await upsertProduct(fromFormProduct(p));

  await db.put(STORES.customers, {id:uid('c'), name:'Cliente Genérico', wp:'', cell:'', cpf:'', email:'', limit:0, due:'', saldo:0, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString()});
  await settings.set('seeded', true);
}

/* ---------- Ads carousel ---------- */
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
    return filtered.slice(0, 3);
  },
  async render(){
    const inner = $('#carouselInner');
    const dots = $('#carouselDots');
    const items = await this.pickAds();

    const defaults = [
      {title:'Atacadistas e fornecedores', subtitle:'Anuncie aqui para mercearias', type:'image', mediaUrl:'', link:''},
      {title:'Controle Fácil', subtitle:'Venda + Estoque na palma da mão', type:'image', mediaUrl:'', link:''},
      {title:'Promoção do dia', subtitle:'Destaque produtos de giro', type:'image', mediaUrl:'', link:''},
    ];
    const list = items.length ? items : defaults;

    inner.innerHTML = '';
    dots.innerHTML = '';
    list.forEach((ad, i) => {
      const slide = document.createElement('div');
      slide.className = 'slide';

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
        const ph = document.createElement('div');
        ph.style.cssText = 'position:absolute;inset:0;background:radial-gradient(circle at 20% 20%, rgba(20,184,166,.35), transparent 55%), radial-gradient(circle at 80% 70%, rgba(34,197,94,.22), transparent 50%), linear-gradient(90deg, rgba(15,27,49,.7), rgba(15,27,49,.35));';
        media.appendChild(ph);
      }

      const overlay = document.createElement('div');
      overlay.className = 'slideOverlay';

      const text = document.createElement('div');
      text.className = 'slideText';
      text.innerHTML = `<b>${escapeHtml(ad.title||'Propaganda')}</b><small>${escapeHtml(ad.subtitle||'')}</small>`;

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

/* ---------- Sale wizard state ---------- */
let sale = null; // {id, items[], customerId|null, customerObj|null}
let saleStep = 1;

function saleTotal(){
  return sale.items.reduce((s,it)=>s+(it.qty||0)*(it.price||0),0);
}

function setSaleChips(){
  $('#saleTotalChip').textContent = 'Total: ' + money.fmt(saleTotal());
  const cname = sale.customerObj?.name ? sale.customerObj.name : 'Balcão';
  $('#saleCustomerChip').textContent = 'Cliente: ' + cname;
}

function setStepsUI(){
  const st1 = $('#st1'), st2 = $('#st2'), st3 = $('#st3');
  const cOk = !!sale.customerId || sale.customerObj === null; // balcão é ok
  st1.className = 'step ' + (saleStep===1?'active':(saleStep>1?'ok':'' ));
  st2.className = 'step ' + (saleStep===2?'active':(saleStep>2?'ok':'' ));
  st3.className = 'step ' + (saleStep===3?'active':'' );

  $('#saleStep1').classList.toggle('active', saleStep===1);
  $('#saleStep2').classList.toggle('active', saleStep===2);
  $('#saleStep3').classList.toggle('active', saleStep===3);
}

function gotoSaleStep(n){
  saleStep = n;
  setStepsUI();
  if(n===2) $('#scanInput')?.focus();
  if(n===3) renderPaySummary();
}

/* ---------- Customers ---------- */
async function getCustomers(){
  const list = await db.all(STORES.customers);
  return list.filter(c => (c.name||'').toLowerCase() !== 'cliente genérico')
             .sort((a,b)=>(a.name||'').localeCompare(b.name||''));
}

function normalizePhone(s){
  return String(s||'').replace(/\D/g,'');
}

async function pickCustomerBySearch(){
  const list = await getCustomers();
  const term = (prompt('Digite parte do NOME ou WhatsApp do cliente:') || '').trim().toLowerCase();
  if(!term) return null;
  const found = list.find(c => (c.name||'').toLowerCase().includes(term) || normalizePhone(c.wp).includes(normalizePhone(term)));
  if(!found){
    toast('Não encontrado', 'Cadastre o cliente novo.');
    return null;
  }
  return found;
}

async function newCustomerQuick(){
  const name = (prompt('Nome do cliente:') || '').trim();
  if(!name) return null;
  const wp = (prompt('WhatsApp (com DDD):') || '').trim();
  const c = {
    id: uid('c'),
    name, wp, cell:'', cpf:'', email:'',
    limit: 0, due:'', saldo:0,
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };
  await db.put(STORES.customers, c);
  toast('Cliente cadastrado', name);
  return c;
}

/* ---------- Products ---------- */
async function fileToDataUrl(file){
  if(!file) return null;
  const buf = await file.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return `data:${file.type};base64,${b64}`;
}

async function addToSaleByEan(ean){
  const products = await db.all(STORES.products);
  let p = products.find(x => x.ean === ean);

  if(!p){
    // Produto não existe: captura frente/verso e abre cadastro no estoque
    toast('Produto não encontrado', 'Vamos cadastrar por foto (frente e verso).');
    await captureProductPhotosAndCreate(ean);
    return;
  }

  const found = sale.items.find(i => i.productId === p.id);
  if(found) found.qty += 1;
  else sale.items.push({productId:p.id, ean:p.ean, name:p.name, qty:1, price:p.price||0});

  renderSaleItems();
}

async function captureProductPhotosAndCreate(ean){
  // 1) foto frente
  const front = await pickFile('#capFront');
  if(!front){ toast('Cancelado','Sem foto da frente'); return; }
  // 2) foto verso
  const back = await pickFile('#capBack');
  if(!back){ toast('Cancelado','Sem foto do verso'); return; }

  // abre tela de estoque com campos pré-preenchidos
  navigate('#/estoque');
  setTimeout(async ()=>{
    await editProduct(null);
    $('#pEan').value = ean;
    $('#pSku').value = productSkuFrom(ean);
    $('#pQty').value = '1';
    $('#pPrice').value = '0,00';
    $('#pCost').value = '0,00';

    // injeta fotos já capturadas no editor (salvas ao clicar "Salvar")
    // (guardamos temporário em window)
    window.__tempFront = front;
    window.__tempBack = back;

    toast('Cadastro do produto', 'Preencha os campos e clique SALVAR. Depois volte para Vender.');
  }, 50);
}

function pickFile(selector){
  return new Promise((resolve)=>{
    const inp = $(selector);
    inp.value = '';
    inp.onchange = async () => {
      const f = inp.files?.[0] || null;
      if(!f) return resolve(null);
      resolve({
        name:f.name,
        type:f.type,
        dataUrl: await fileToDataUrl(f)
      });
    };
    inp.click();
  });
}

/* ---------- Venda UI ---------- */
function clearSale(){
  sale = { id: uid('s'), items: [], customerId: null, customerObj: null };
  $('#saleTable tbody').innerHTML = '';
  $('#saleSummary tbody').innerHTML = '';
  ['payCash','payPix','payCard','payFiado','cashReceived'].forEach(id => { const el=$('#'+id); if(el) el.value=''; });
  $('#paySumChip').textContent = 'Pago: R$ 0,00';
  $('#payChangeChip').textContent = 'Troco: R$ 0,00';
  $('#payTotalChip').textContent = 'Total: R$ 0,00';
  setSaleChips();
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
      setSaleChips();
    });
    removeBtn.addEventListener('click', ()=>{
      sale.items = sale.items.filter(x => x !== it);
      renderSaleItems();
    });

    tb.appendChild(tr);
  }
  setSaleChips();
}

function renderPaySummary(){
  const tb = $('#saleSummary tbody');
  tb.innerHTML = '';
  for(const it of sale.items){
    const tr = document.createElement('tr');
    tr.className = 'tr';
    tr.innerHTML = `<td>${escapeHtml(it.name||'')}</td><td>${it.qty}</td><td>${money.fmt((it.qty||0)*(it.price||0))}</td>`;
    tb.appendChild(tr);
  }
  $('#payTotalChip').textContent = 'Total: ' + money.fmt(saleTotal());
  refreshPay();
}

function refreshPay(){
  const total = saleTotal();
  const cash = money.parse($('#payCash').value);
  const pix = money.parse($('#payPix').value);
  const card = money.parse($('#payCard').value);
  const fiado = money.parse($('#payFiado').value);
  const paid = cash + pix + card + fiado;

  $('#paySumChip').textContent = 'Pago: ' + money.fmt(paid);

  // Troco: baseado no "dinheiro recebido" vs dinheiro que entrou no pagamento
  const received = money.parse($('#cashReceived').value);
  const change = Math.max(0, received - cash);
  $('#payChangeChip').textContent = 'Troco: ' + money.fmt(change);

  // botão WhatsApp
  const hasWp = !!normalizePhone(sale.customerObj?.wp);
  $('#btnSendWhats').disabled = !hasWp;
}

/* ---------- Checkout + WhatsApp ---------- */
async function checkoutSale(){
  if(!sale.items.length){
    toast('Venda vazia','Adicione itens primeiro.');
    return;
  }

  const total = saleTotal();
  const cash = money.parse($('#payCash').value);
  const pix = money.parse($('#payPix').value);
  const card = money.parse($('#payCard').value);
  const fiadoVal = money.parse($('#payFiado').value);
  const paid = cash + pix + card + fiadoVal;

  if(paid + 0.0001 < total){
    toast('Pagamento insuficiente', 'Complete o pagamento.');
    return;
  }

  // baixar estoque
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

  // fiado no cliente
  let custUpdate = null;
  if(fiadoVal > 0 && sale.customerId){
    const c = await db.get(STORES.customers, sale.customerId);
    if(c){
      const novoSaldo = (c.saldo||0) + fiadoVal;
      const limite = (c.limit||0);
      if(limite > 0 && novoSaldo > limite){
        toast('Limite de fiado', 'Ajuste o valor ou o limite.');
        return;
      }
      custUpdate = {...c, saldo: novoSaldo, updatedAt: new Date().toISOString()};
    }
  }

  const rec = {
    id: sale.id,
    createdAt: new Date().toISOString(),
    customerId: sale.customerId,
    customerName: sale.customerObj?.name || '',
    customerWp: sale.customerObj?.wp || '',
    items: sale.items.map(x=>({productId:x.productId, ean:x.ean, name:x.name, qty:x.qty, price:x.price})),
    total,
    pay: { cash, pix, card, fiado: fiadoVal, cashReceived: money.parse($('#cashReceived').value) },
    device: device.type
  };

  try{
    for(const p of updated) await db.put(STORES.products, p);
    if(custUpdate) await db.put(STORES.customers, custUpdate);
    await db.put(STORES.sales, rec);

    toast('Venda finalizada', money.fmt(total));

    // envia WhatsApp se tiver
    await sendWhatsAppSummary(false);

    // reset
    clearSale();
    gotoSaleStep( (await settings.get('saleMode','advanced')) === 'simple' ? 2 : 1 );
    await renderStock();
    await renderFiado();
    await renderDash();
  }catch(err){
    console.error(err);
    toast('Erro ao salvar', 'Tente novamente.');
  }
}

function buildSummaryText(){
  const store = 'Controle Fácil';
  const cname = sale.customerObj?.name ? sale.customerObj.name : 'Balcão';
  const lines = [];
  lines.push(`${store}`);
  lines.push(`Cliente: ${cname}`);
  lines.push(`Itens:`);

  for(const it of sale.items){
    lines.push(`- ${it.name} x${it.qty} = ${money.fmt((it.qty||0)*(it.price||0))}`);
  }
  lines.push(``);
  lines.push(`Total: ${money.fmt(saleTotal())}`);

  const cash = money.parse($('#payCash').value);
  const pix = money.parse($('#payPix').value);
  const card = money.parse($('#payCard').value);
  const fiado = money.parse($('#payFiado').value);

  lines.push(`Pagamento:`);
  if(cash>0) lines.push(`Dinheiro: ${money.fmt(cash)}`);
  if(pix>0) lines.push(`PIX: ${money.fmt(pix)}`);
  if(card>0) lines.push(`Cartão: ${money.fmt(card)}`);
  if(fiado>0) lines.push(`Fiado: ${money.fmt(fiado)}`);

  const change = Math.max(0, money.parse($('#cashReceived').value) - cash);
  if(change>0) lines.push(`Troco: ${money.fmt(change)}`);

  lines.push(``);
  lines.push(`Obrigado pela preferência!`);

  return lines.join('\n');
}

async function sendWhatsAppSummary(manual=true){
  const wp = normalizePhone(sale.customerObj?.wp);
  if(!wp){
    if(manual) toast('Sem WhatsApp','Cadastre o WhatsApp do cliente.');
    return;
  }
  const text = encodeURIComponent(buildSummaryText());
  window.open(`https://wa.me/55${wp}?text=${text}`, '_blank');
}

/* ---------- Camera scan ---------- */
async function scanByCamera(){
  if(!('BarcodeDetector' in window)){
    toast('Sem leitor por câmera', 'Use leitor Bluetooth ou digite o EAN.');
    return;
  }
  const formats = ['ean_13','ean_8','code_128','code_39','qr_code','upc_a','upc_e'];
  const detector = new BarcodeDetector({formats});
  let stream = null;
  let running = true;

  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:60;display:grid;place-items:center;padding:16px;';
  wrap.innerHTML = `
    <div style="width:min(560px,100%);background:rgba(15,27,49,.98);border:1px solid rgba(255,255,255,.12);border-radius:18px;overflow:hidden">
      <div style="padding:10px 12px;display:flex;justify-content:space-between;align-items:center;color:#e5e7eb">
        <b>Leitor pela câmera</b>
        <button id="camClose" class="btn" type="button" style="padding:10px 12px">Fechar</button>
      </div>
      <div style="position:relative;aspect-ratio: 16/10;background:#000">
        <video id="camVideo" autoplay playsinline muted style="width:100%;height:100%;object-fit:cover"></video>
        <div style="position:absolute;inset:16px;border:2px dashed rgba(20,184,166,.7);border-radius:18px"></div>
      </div>
      <div style="padding:10px 12px;color:#98a2b3;font-size:12px">Aponte para o código. Quando ler, o item entra na venda.</div>
    </div>
  `;
  document.body.appendChild(wrap);
  $('#camClose', wrap).addEventListener('click', ()=>{ running=false; cleanup(); });

  const video = $('#camVideo', wrap);

  try{
    stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    video.srcObject = stream;

    const tick = async ()=>{
      if(!running) return;
      try{
        const barcodes = await detector.detect(video);
        if(barcodes?.length){
          const code = barcodes[0].rawValue;
          running = false;
          cleanup();
          if(code) await addToSaleByEan(code);
          return;
        }
      }catch(_){}
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }catch(err){
    console.error(err);
    toast('Câmera bloqueada', 'Permita acesso.');
    running = false;
    cleanup();
  }

  function cleanup(){
    try{ stream?.getTracks()?.forEach(t=>t.stop()); }catch(_){}
    wrap.remove();
  }
}

/* ---------- Estoque UI ---------- */
async function renderStock(){
  const q = ($('#stockSearch')?.value || '').trim().toLowerCase();
  const rows = await db.all(STORES.products);
  const list = rows
    .filter(p => {
      if(!q) return true;
      return (p.name||'').toLowerCase().includes(q) ||
             (p.ean||'').includes(q) ||
             (p.sku||'').toLowerCase().includes(q);
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
      <td><button class="btn" type="button">Editar</button></td>
    `;
    $('button', tr).addEventListener('click', ()=>editProduct(p.id));
    tb.appendChild(tr);
  }
}

async function editProduct(id){
  const p = id ? await db.get(STORES.products, id) : null;

  $('#pEan').value = p?.ean || '';
  $('#pSku').value = p?.sku || (p?.ean ? productSkuFrom(p.ean) : '');
  $('#pName').value = p?.name || '';
  $('#pBrand').value = p?.brand || '';
  $('#pVendor').value = p?.vendor || '';
  $('#pCat').value = p?.cat || '';
  $('#pExp').value = p?.exp || '';
  $('#pUnit').value = p?.unit || 'un';
  $('#pContent').value = p ? String(p.content ?? 0).replace('.',',') : '0';

  $('#pQty').value = p ? String(p.qty ?? 0) : '0';
  $('#pPrice').value = p ? String(p.price ?? 0).replace('.',',') : '0,00';
  $('#pCost').value = p ? String(p.cost ?? 0).replace('.',',') : '0,00';
  $('#pStatus').value = p?.status || 'ativo';

  $('#pFront').value = '';
  $('#pBack').value = '';

  $('#btnDeleteProduct').dataset.id = p?.id || '';
  $('#btnSaveProduct').dataset.id = p?.id || '';
}

async function saveProductFromForm(){
  const id = $('#btnSaveProduct').dataset.id || null;
  const existing = id ? await db.get(STORES.products, id) : null;

  const frontFile = $('#pFront').files?.[0] || null;
  const backFile  = $('#pBack').files?.[0] || null;

  const tempFront = window.__tempFront || null;
  const tempBack  = window.__tempBack  || null;

  const front = frontFile ? {name:frontFile.name,type:frontFile.type,dataUrl: await fileToDataUrl(frontFile)} : (tempFront || existing?.front || null);
  const back  = backFile  ? {name:backFile.name,type:backFile.type,dataUrl: await fileToDataUrl(backFile)}  : (tempBack  || existing?.back  || null);

  window.__tempFront = null;
  window.__tempBack = null;

  const p = fromFormProduct({
    id: id || undefined,
    ean: $('#pEan').value,
    sku: $('#pSku').value,
    name: $('#pName').value,
    brand: $('#pBrand').value,
    vendor: $('#pVendor').value,
    cat: $('#pCat').value,
    exp: $('#pExp').value,
    unit: $('#pUnit').value,
    content: money.parse($('#pContent').value),
    qty: money.parse($('#pQty').value),
    price: money.parse($('#pPrice').value),
    cost: money.parse($('#pCost').value),
    status: $('#pStatus').value,
    front,
    back,
    createdAt: existing?.createdAt
  });

  if(!p.ean || !p.name){
    toast('Campos obrigatórios', 'EAN e Descrição.');
    return;
  }

  await upsertProduct(p);
  toast('Produto salvo', p.name);
  await renderStock();
  await editProduct(p.id);

  // se a venda estava aguardando cadastro, volta para vender e adiciona
  if(sale && saleStep>=2){
    navigate('#/vender');
    setTimeout(async ()=>{
      await addToSaleByEan(p.ean);
      gotoSaleStep(2);
    }, 80);
  }
}

async function deleteProductFromForm(){
  const id = $('#btnDeleteProduct').dataset.id;
  if(!id){ toast('Nada para excluir',''); return; }
  await db.del(STORES.products, id);
  toast('Produto excluído','');
  await renderStock();
  await editProduct(null);
}

/* ---------- Fiado/Clientes ---------- */
let currentCustomerId = null;

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
  for(const c of list.filter(x=>(x.name||'').toLowerCase() !== 'cliente genérico').sort((a,b)=>(a.name||'').localeCompare(b.name||''))){
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
  currentCustomerId = c.id;
}

function sendWp(){
  const wp = normalizePhone($('#cWp').value);
  const limit = $('#cLimit').value.trim();
  if(!wp){ toast('WhatsApp vazio','Informe o número'); return; }
  const msg = encodeURIComponent(`Cliente cadastrado com sucesso! Limite: R$${limit || '0,00'}`);
  window.open(`https://wa.me/55${wp}?text=${msg}`, '_blank');
}

/* ---------- Accounts + Dashboard + CSV ---------- */
async function saveAccount(){
  const type = $('#accType').value;
  const desc = $('#accDesc').value.trim();
  const amount = money.parse($('#accAmount').value);
  const due = $('#accDue').value;
  const parc = Math.max(1, parseInt($('#accParc').value || '1', 10) || 1);
  const vendor = $('#accVendor').value.trim();
  const category = $('#accCategory').value.trim();
  const payMethod = $('#accPayMethod').value;
  const ean = $('#accEan').value.trim();

  if(!desc || !due || amount <= 0){
    toast('Campos obrigatórios','Descrição, vencimento e valor.');
    return;
  }

  const baseId = uid('a');
  const items = [];
  for(let i=0;i<parc;i++){
    const d = new Date(due);
    d.setMonth(d.getMonth()+i);
    items.push({
      id: baseId + '_' + (i+1),
      type, desc: parc>1 ? `${desc} (${i+1}/${parc})` : desc,
      vendor, category, payMethod, ean,
      amount,
      due: d.toISOString().slice(0,10),
      createdAt: new Date().toISOString(),
      status: 'aberto'
    });
  }
  for(const it of items) await db.put(STORES.accounts, it);

  toast('Conta salva', `${parc} lançamento(s)`);
  ['accDesc','accAmount','accVendor','accCategory','accParc','accEan'].forEach(id=>$('#'+id).value='');
  await renderAccounts();
}

async function renderAccounts(){
  const list = await db.all(STORES.accounts);
  const sorted = list.sort((a,b)=>(a.due||'').localeCompare(b.due||'')).slice(0, 12);
  const tb = $('#accTable tbody');
  tb.innerHTML = '';
  for(const a of sorted){
    const tr = document.createElement('tr');
    tr.className = 'tr';
    tr.innerHTML = `<td>${escapeHtml(a.type)}</td><td>${escapeHtml(a.desc)}</td><td>${escapeHtml(a.due)}</td><td>${money.fmt(a.amount)}</td>`;
    tb.appendChild(tr);
  }
}

async function renderDash(){
  const sales = await db.all(STORES.sales);
  const now = new Date();
  const day = now.toISOString().slice(0,10);
  const month = now.toISOString().slice(0,7);

  const daySales = sales.filter(s => (s.createdAt||'').slice(0,10) === day);
  const monthSales = sales.filter(s => (s.createdAt||'').slice(0,7) === month);

  const sum = arr => arr.reduce((t,s)=>t+(s.total||0),0);
  const dayTotal = sum(daySales);
  const monthTotal = sum(monthSales);
  const ticket = daySales.length ? (dayTotal / daySales.length) : 0;

  $('#kpiDay').textContent = `Hoje: ${money.fmt(dayTotal)}`;
  $('#kpiMonth').textContent = `Mês: ${money.fmt(monthTotal)}`;
  $('#kpiTicket').textContent = `Ticket: ${money.fmt(ticket)}`;

  const agg = new Map();
  for(const s of monthSales){
    for(const it of (s.items||[])){
      const key = it.name || it.ean || it.productId;
      agg.set(key, (agg.get(key)||0) + (it.qty||0));
    }
  }
  const top = Array.from(agg.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const tb = $('#topTable tbody');
  tb.innerHTML = '';
  for(const [name, qty] of top){
    const tr = document.createElement('tr');
    tr.className = 'tr';
    tr.innerHTML = `<td>${escapeHtml(name)}</td><td>${qty}</td>`;
    tb.appendChild(tr);
  }
}

async function exportCsv(kind){
  const store = STORES[kind];
  if(!store){ toast('Não implementado',''); return; }
  const rows = await db.all(store);
  const csv = toCsv(rows);
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `controle-facil_${kind}_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('Exportado', a.download);
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

  if(!title){ toast('Título obrigatório',''); return; }

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

/* ---------- Service Worker ---------- */
(async function registerSW(){
  if('serviceWorker' in navigator){
    try{ await navigator.serviceWorker.register('./sw.js'); }
    catch(err){ console.warn('SW failed', err); }
  }
})();

/* ---------- Venda: entrada ---------- */
async function enterSale(){
  if(!sale) clearSale();

  const saleMode = await settings.get('saleMode','advanced');
  $('#saleModeChip2').textContent = 'Modo: ' + (saleMode==='simple' ? 'Simples' : 'Avançado');

  // modo simples pula cliente
  if(saleMode === 'simple'){
    sale.customerId = null;
    sale.customerObj = null;
    gotoSaleStep(2);
  } else {
    gotoSaleStep(1);
  }
  setSaleChips();
}

/* ---------- Init ---------- */
async function init(){
  renderNet();
  await db.open();
  await seedIfEmpty();

  $('#deviceChip').textContent = 'Dispositivo: ' + (device.type==='desktop' ? 'Notebook' : 'Celular');
  $('#storeChip').textContent = 'Loja: ' + (await settings.get('storeName','Piloto'));
  $('#planChip').textContent = 'Plano: ' + (await settings.get('plan','free')).toUpperCase();

  const sm = await settings.get('saleMode','advanced');
  $('#saleModeChip').textContent = 'Venda: ' + (sm==='simple' ? 'Simples' : 'Avançado');

  $$('[data-nav]').forEach(b => b.addEventListener('click', () => navigate(b.getAttribute('data-nav'))));

  window.addEventListener('hashchange', onRoute);
  onRoute();

  await carousel.render();
  setInterval(()=>carousel.render(), 60_000);

  // vender: step1 buttons
  $('#btnClientSkip').addEventListener('click', ()=>{
    sale.customerId = null; sale.customerObj = null;
    setSaleChips();
    gotoSaleStep(2);
  });

  $('#btnClientNew').addEventListener('click', async ()=>{
    const c = await newCustomerQuick();
    if(!c) return;
    sale.customerId = c.id; sale.customerObj = c;
    setSaleChips();
    gotoSaleStep(2);
  });

  $('#btnClientSearch').addEventListener('click', async ()=>{
    const c = await pickCustomerBySearch();
    if(!c) return;
    sale.customerId = c.id; sale.customerObj = c;
    setSaleChips();
    gotoSaleStep(2);
  });

  $('#btnClientScan').addEventListener('click', async ()=>{
    // simples: captura via prompt (na próxima revisão fazemos leitura QR/código real)
    const term = (prompt('Digite o código do cliente (ou parte do nome):') || '').trim().toLowerCase();
    if(!term) return;
    const list = await getCustomers();
    const c = list.find(x => (x.name||'').toLowerCase().includes(term) || normalizePhone(x.wp).includes(normalizePhone(term)));
    if(!c){ toast('Não encontrado', 'Use procurar ou cadastrar novo.'); return; }
    sale.customerId = c.id; sale.customerObj = c;
    setSaleChips();
    gotoSaleStep(2);
  });

  // vender: scan
  $('#scanInput').addEventListener('keydown', async (e)=>{
    if(e.key === 'Enter'){
      const code = $('#scanInput').value.trim();
      $('#scanInput').value = '';
      if(code) await addToSaleByEan(code);
    }
  });
  $('#btnScanCam').addEventListener('click', scanByCamera);

  $('#btnClearSale').addEventListener('click', ()=>{
    clearSale();
    toast('Venda limpa','');
  });

  $('#btnGoPay').addEventListener('click', ()=>{
    if(!sale.items.length){ toast('Sem itens', 'Adicione produtos primeiro.'); return; }
    gotoSaleStep(3);
  });

  $('#btnBackProducts').addEventListener('click', ()=>gotoSaleStep(2));

  // pagamento inputs
  ['payCash','payPix','payCard','payFiado','cashReceived'].forEach(id=>{
    $('#'+id).addEventListener('input', refreshPay);
  });

  $('#btnCheckout').addEventListener('click', checkoutSale);
  $('#btnSendWhats').addEventListener('click', ()=>sendWhatsAppSummary(true));

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

  // admin: modo venda
  $('#saleModeSelect').value = sm;
  $('#btnSetSaleMode').addEventListener('click', async ()=>{
    const v = $('#saleModeSelect').value;
    await settings.set('saleMode', v);
    $('#saleModeChip').textContent = 'Venda: ' + (v==='simple' ? 'Simples' : 'Avançado');
    toast('Modo de venda aplicado', v==='simple'?'Simples':'Avançado');
  });

  // admin: plano
  $('#planSelect').value = await settings.get('plan','free');
  $('#btnSetPlan').addEventListener('click', async ()=>{
    const v = $('#planSelect').value;
    await settings.set('plan', v);
    $('#planChip').textContent = 'Plano: ' + v.toUpperCase();
    toast('Plano aplicado', v.toUpperCase());
  });

  // admin: ads
  $('#btnSaveAd').addEventListener('click', saveAd);

  await renderStock();
  await renderFiado();
  await renderDash();
  await renderAccounts();
  await renderAdsTable();
}
document.addEventListener('DOMContentLoaded', init);