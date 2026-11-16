import "@fontsource-variable/dm-sans";
import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import QRCode from 'qrcode';
import { createPayload } from './payload.js';

const icons = {
  url: '<path d="M10 13.5a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 4.8l-1.5 1.5m2.5 4.2a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5"/>',
  contact: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="2.5"/><path d="M8 17a4 4 0 0 1 8 0"/>',
  wifi: '<path d="M3 8a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0m-9 4a4.5 4.5 0 0 1 6 0"/><circle cx="12" cy="20" r=".75"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  upload: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5-8 8"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"/>',
};
const icon = (name) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + icons[name] + '</svg>';

const types = {
  url: { label: 'URL', fields: [{ name: 'url', label: 'Website URL', inputMode: 'url', placeholder: 'https://example.com' }] },
  contact: { label: 'Contact', fields: [
    { name: 'first', label: 'First name', half: true },
    { name: 'last', label: 'Last name', half: true },
    { name: 'phone', label: 'Phone', type: 'tel', half: true },
    { name: 'email', label: 'Email', type: 'email', half: true },
    { name: 'organization', label: 'Company/Organization', half: true },
    { name: 'position', label: 'Job Title', placeholder: 'e.g. Designer', half: true },
  ] },
  wifi: { label: 'Wi-Fi', fields: [
    { name: 'ssid', label: 'Network name (SSID)', placeholder: 'My Wi-Fi' },
    { name: 'security', label: 'Security', options: { WPA: 'WPA / WPA2 / WPA3', WEP: 'WEP', nopass: 'Open network' } },
    { name: 'password', label: 'Password', type: 'password' },
    { name: 'hidden', label: 'Hidden network', type: 'checkbox' },
  ] },
  email: { label: 'Email', fields: [
    { name: 'email', label: 'Recipient email', type: 'email', placeholder: 'hello@example.com' },
  ] },
};

const valuesByType = {
  url: { url: 'https://example.com' },
  contact: { first: '', last: '', phone: '', email: '', organization: '', position: '' },
  wifi: { ssid: '', password: '', security: 'WPA', hidden: false },
  email: { email: '' },
};

const get = (id) => document.getElementById(id);
const fields = get('fields');
const canvas = get('qr');
const download = get('download');
const logoFile = get('logo-file');
const logoError = get('logo-error');
const uploadMark = get('upload-mark');
const removeLogo = get('remove-logo');
const qrPaper = get('qr-paper');
const shape = get('qr-shape');
const foreground = get('qr-color');
const background = get('qr-background');
const transparent = get('qr-transparent');
let type = 'url';
let logo = null;
let uploadGeneration = 0;

get('choices').innerHTML = Object.entries(types).map(([key, config]) =>
  '<label class="choice"><input type="radio" name="type" value="' + key + '"' +
  (key === type ? ' checked' : '') + '><span>' + icon(key) + config.label + '</span></label>'
).join('');
uploadMark.innerHTML = icon('upload');
download.innerHTML = icon('download') + 'Download PNG';

function renderFields() {
  const values = valuesByType[type];
  fields.replaceChildren();
  for (const field of types[type].fields) {
    if (field.name === 'password' && values.security === 'nopass') continue;
    const row = document.createElement('div');
    row.className = 'field' + (field.half ? ' half' : '');
    const label = document.createElement('label');
    label.htmlFor = 'field-' + field.name;
    label.textContent = field.label;
    const control = document.createElement(field.options ? 'select' : 'input');
    control.id = label.htmlFor;
    control.name = field.name;
    if (field.options) {
      for (const [value, text] of Object.entries(field.options)) control.add(new Option(text, value));
    }
    if (field.type) control.type = field.type;
    if (field.inputMode) control.inputMode = field.inputMode;
    if (field.placeholder) control.placeholder = field.placeholder;
    if (field.type === 'checkbox') {
      row.classList.add('checkbox');
      control.checked = values[field.name];
      label.prepend(control);
      row.append(label);
    } else {
      control.value = values[field.name];
      row.append(label, control);
    }
    fields.append(row);
  }
}

function drawCode(text) {
  const matrix = QRCode.create(text, { errorCorrectionLevel: logo ? 'H' : 'M' }).modules;
  const size = 1024;
  const scale = Math.floor(size / (matrix.size + 8));
  const offset = Math.floor((size - matrix.size * scale) / 2);
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const backgroundColor = transparent.checked ? null : background.value;
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, size, size);
  }
  const moduleShape = shape.value;
  ctx.fillStyle = foreground.value;
  for (let row = 0; row < matrix.size; row++) {
    for (let column = 0; column < matrix.size; column++) {
      if (!matrix.get(row, column)) continue;
      const x = offset + column * scale;
      const y = offset + row * scale;
      if (moduleShape === 'square' || matrix.isReserved(row, column)) {
        ctx.fillRect(x, y, scale, scale);
        continue;
      }
      ctx.beginPath();
      if (moduleShape === 'rounded') {
        ctx.roundRect(x, y, scale, scale, scale * .28);
      } else {
        ctx.arc(x + scale / 2, y + scale / 2, scale * .48, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  }
  if (logo) {
    const plate = Math.floor(matrix.size * .17) * scale;
    const start = (size - plate) / 2;
    const fit = (plate - scale) / Math.max(logo.naturalWidth, logo.naturalHeight);
    const width = logo.naturalWidth * fit;
    const height = logo.naturalHeight * fit;
    if (backgroundColor) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(start, start, plate, plate);
    } else {
      ctx.clearRect(start, start, plate, plate);
    }
    ctx.drawImage(logo, (size - width) / 2, (size - height) / 2, width, height);
  }
}

function updatePreview() {
  const payload = createPayload(type, valuesByType[type]);
  let message = payload.message;
  if (payload.text) {
    try {
      drawCode(payload.text);
    } catch {
      message = 'This content is too long for one QR code. Try shortening it or removing the logo.';
    }
  }
  qrPaper.hidden = Boolean(message);
  get('preview-message').textContent = message || '';
  download.disabled = Boolean(message);
}

get('choices').addEventListener('change', (event) => {
  type = event.target.value;
  renderFields();
  updatePreview();
});
fields.addEventListener('input', ({ target }) => {
  valuesByType[type][target.name] = target.type === 'checkbox' ? target.checked : target.value;
  if (target.name === 'security') {
    renderFields();
    get('field-security').focus();
  }
  updatePreview();
});
get('qr-form').addEventListener('submit', (event) => event.preventDefault());
get('appearance').addEventListener('input', () => {
  background.disabled = transparent.checked;
  qrPaper.classList.toggle('transparent', transparent.checked);
  updatePreview();
});

function showLogoError(message) {
  logoError.textContent = message;
  logoError.hidden = !message;
}

get('upload-button').addEventListener('click', () => logoFile.click());
logoFile.addEventListener('change', async () => {
  const [file] = logoFile.files;
  logoFile.value = '';
  if (!file) return;
  const generation = ++uploadGeneration;
  showLogoError('');
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    showLogoError('Choose a PNG, JPG, WebP or GIF image up to 5 MB.');
    return;
  }
  const image = new Image();
  image.alt = '';
  const url = URL.createObjectURL(file);
  try {
    image.src = url;
    await image.decode();
    if (generation !== uploadGeneration) return;
    logo = image;
    uploadMark.replaceChildren(image);
    get('upload-title').textContent = file.name;
    get('upload-hint').textContent = 'Choose a different logo';
    removeLogo.hidden = false;
    updatePreview();
  } catch {
    if (generation === uploadGeneration) showLogoError('This image could not be opened. Try another file.');
  } finally {
    URL.revokeObjectURL(url);
  }
});

removeLogo.addEventListener('click', () => {
  uploadGeneration++;
  logo = null;
  uploadMark.innerHTML = icon('upload');
  get('upload-title').textContent = 'Upload a logo';
  get('upload-hint').textContent = 'PNG, JPG, WebP or GIF · Up to 5 MB';
  removeLogo.hidden = true;
  showLogoError('');
  get('upload-button').focus();
  updatePreview();
});

download.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'qr-' + type + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

renderFields();
updatePreview();
