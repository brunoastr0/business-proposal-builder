'use strict';

/* ── Quill editors ────────────────────────────────────── */

const TOOLBAR = [
  ['bold', 'italic', 'underline'],
  [{ header: 2 }, { header: 3 }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote'],
  ['clean'],
];

const SECTION_KEYS = ['summary', 'problem', 'solution', 'investment', 'terms'];
const editors = {};
SECTION_KEYS.forEach(key => {
  editors[key] = new Quill(`#editor-${key}`, {
    theme: 'snow',
    modules: { toolbar: TOOLBAR },
    placeholder: 'Escreva o conteúdo desta secção…',
  });
});

/* ── Image management ────────────────────────────────── */

let imgCounter = 0;
const imageStore = {};   // id → { data, name, caption, mimeType }

function addImage() {
  const id = imgCounter++;
  imageStore[id] = { data: '', name: '', caption: '', mimeType: 'image/jpeg' };

  document.getElementById('images-empty').style.display = 'none';

  const item = document.createElement('div');
  item.className = 'image-item';
  item.dataset.id = id;
  item.innerHTML = `
    <label class="image-drop" for="img-file-${id}" title="Clique para selecionar imagem">
      <img id="img-preview-${id}" src="" alt="" style="display:none">
      <div class="img-placeholder" id="img-ph-${id}">
        <div class="img-icon">🖼</div>
        <div>Clique para selecionar<br><small>JPG · PNG</small></div>
      </div>
      <input type="file" id="img-file-${id}" accept="image/jpeg,image/png"
             style="display:none" onchange="loadImage(${id}, this)">
    </label>
    <div class="image-meta">
      <input class="img-caption" type="text" placeholder="Descrição / legenda"
             oninput="imageStore[${id}].caption = this.value">
      <button class="remove-img-btn" onclick="removeImage(${id})">Remover imagem</button>
    </div>`;

  document.getElementById('images-container').appendChild(item);
}

function loadImage(id, input) {
  const file = input.files[0];
  if (!file) return;
  imageStore[id].name = file.name;
  imageStore[id].mimeType = file.type;

  const reader = new FileReader();
  reader.onload = e => {
    imageStore[id].data = e.target.result;
    document.getElementById(`img-preview-${id}`).src = e.target.result;
    document.getElementById(`img-preview-${id}`).style.display = 'block';
    document.getElementById(`img-ph-${id}`).style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function removeImage(id) {
  delete imageStore[id];
  document.querySelector(`.image-item[data-id="${id}"]`).remove();
  if (Object.keys(imageStore).length === 0) {
    document.getElementById('images-empty').style.display = 'block';
  }
}

/* ── Products table ──────────────────────────────────── */

let prodCounter = 0;
const productStore = {};   // id → { name, price, qty }

function addProduct() {
  const id = prodCounter++;
  productStore[id] = { name: '', price: 0, qty: 1 };

  const emptyRow = document.getElementById('products-empty-row');
  if (emptyRow) emptyRow.style.display = 'none';

  const row = document.createElement('tr');
  row.dataset.id = id;
  row.innerHTML = `
    <td><input class="prod-name" type="text" placeholder="Produto ou serviço"
               oninput="productStore[${id}].name = this.value"></td>
    <td style="width:100px">
      <input class="prod-price" type="number" value="0" min="0" step="0.01"
             oninput="productStore[${id}].price = parseFloat(this.value)||0; recalc()">
    </td>
    <td style="width:70px">
      <input class="prod-qty" type="number" value="1" min="0" step="0.01"
             oninput="productStore[${id}].qty = parseFloat(this.value)||0; recalc()">
    </td>
    <td class="td-total" id="prod-total-${id}">0,00</td>
    <td class="td-action">
      <button class="remove-prod-btn" onclick="removeProduct(${id})" title="Remover">×</button>
    </td>`;

  document.getElementById('products-body').appendChild(row);
  recalc();
}

function removeProduct(id) {
  delete productStore[id];
  document.querySelector(`tr[data-id="${id}"]`).remove();
  if (Object.keys(productStore).length === 0) {
    const emptyRow = document.getElementById('products-empty-row');
    if (emptyRow) emptyRow.style.display = '';
  }
  recalc();
}

function recalc() {
  const currency = document.getElementById('currency').value.trim() || '€';
  let subtotal = 0;

  for (const [id, p] of Object.entries(productStore)) {
    const line = p.price * p.qty;
    subtotal += line;
    const el = document.getElementById(`prod-total-${id}`);
    if (el) el.textContent = fmtMoney(line, currency);
  }

  const taxRate = parseFloat(document.getElementById('tax-rate').value) || 0;
  const taxAmt  = subtotal * taxRate / 100;
  const grand   = subtotal + taxAmt;

  document.getElementById('subtotal-display').textContent = fmtMoney(subtotal, currency);
  document.getElementById('tax-display').textContent      = fmtMoney(taxAmt,   currency);
  document.getElementById('grand-display').textContent    = fmtMoney(grand,    currency);
}

function fmtMoney(value, currency) {
  const s    = value.toFixed(2);
  const [i, d] = s.split('.');
  const iFmt = i.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${iFmt},${d} ${currency}`;
}

/* recalc when currency field changes */
document.getElementById('currency').addEventListener('input', recalc);
document.getElementById('tax-rate').addEventListener('input', recalc);

/* ── Partner toggle ──────────────────────────────────── */

document.getElementById('partner-count').addEventListener('change', function () {
  document.getElementById('partner-fields').style.display =
    this.value === '1' ? 'block' : 'none';
});

/* ── Generate PDF ────────────────────────────────────── */

function field(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function hideToast() { document.getElementById('toast').style.display = 'none'; }

function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = type;
  t.style.display = 'block';
}

document.getElementById('generate-btn').addEventListener('click', async () => {
  hideToast();
  const btn = document.getElementById('generate-btn');
  btn.disabled = true;
  btn.classList.add('loading');
  btn.querySelector('.label').textContent = 'A compilar…';

  const sections = {};
  SECTION_KEYS.forEach(key => { sections[key] = editors[key].getSemanticHTML(); });

  const images = Object.values(imageStore)
    .filter(img => img.data)
    .map(img => ({ data: img.data, name: img.name, caption: img.caption, mime_type: img.mimeType }));

  const products = Object.values(productStore)
    .filter(p => p.name || p.price > 0)
    .map(p => ({ name: p.name, price: p.price, quantity: p.qty }));

  const payload = {
    doctype:           field('doctype'),
    client_name:       field('client-name'),
    client_company:    field('client-company'),
    client_address:    field('client-address'),
    client_email:      field('client-email'),
    client_phone:      field('client-phone'),
    proponent_name:    field('proponent-name'),
    proponent_contact: field('proponent-contact'),
    proponent_address: field('proponent-address'),
    proponent_email:   field('proponent-email'),
    proponent_phone:   field('proponent-phone'),
    proponent_website: field('proponent-website'),
    proposal_ref:      field('proposal-ref'),
    proposal_date:     field('proposal-date'),
    proposal_version:  field('proposal-version'),
    currency:          field('currency'),
    partner_count:     field('partner-count'),
    partner_name:      field('partner-name'),
    partner_contact:   field('partner-contact'),
    partner_address:   field('partner-address'),
    partner_email:     field('partner-email'),
    partner_phone:     field('partner-phone'),
    images,
    products,
    tax_rate: parseFloat(document.getElementById('tax-rate').value) || 0,
    sections,
  };

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      showToast('Erro: ' + String(err.detail || res.statusText).slice(0, 500), 'error');
      return;
    }

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `proposta-${payload.proposal_ref.replace(/\//g, '-')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('PDF gerado com sucesso.', 'success');
  } catch (e) {
    showToast('Erro de ligação: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
    btn.querySelector('.label').textContent = 'Gerar PDF';
  }
});
