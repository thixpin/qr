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
  text: '<path d="M5 5h14M12 5v14m-4 0h8"/>',
  phone: '<path d="M7 3h3l1 5-2 2a13 13 0 0 0 5 5l2-2 5 1v3a3 3 0 0 1-3 3A17 17 0 0 1 4 6a3 3 0 0 1 3-3z"/>',
  location: '<path d="M19 10c0 5-7 11-7 11s-7-6-7-11a7 7 0 1 1 14 0z"/><circle cx="12" cy="10" r="2"/>',
  event: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
  upload: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5-8 8"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"/>',
};
const icon = (name) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + icons[name] + '</svg>';

const types = {
  url: { label: 'URL', fields: [{ name: 'url', label: 'Website URL', inputMode: 'url', placeholder: 'https://example.com' }] },
  text: { label: 'Text', fields: [
    { name: 'text', label: 'Text', multiline: true, placeholder: 'Enter your text' },
  ] },
  contact: { label: 'Contact', fields: [
    { name: 'first', label: 'First name', half: true },
    { name: 'last', label: 'Last name', half: true },
    { name: 'phone', label: 'Phone', type: 'tel', half: true },
    { name: 'workPhone', label: 'Work phone', type: 'tel', half: true },
    { name: 'email', label: 'Email', type: 'email', half: true },
    { name: 'workEmail', label: 'Work email', type: 'email', half: true },
    { name: 'organization', label: 'Company/Organization', half: true },
    { name: 'position', label: 'Job Title', placeholder: 'e.g. Designer', half: true },
    { name: 'website', label: 'Website', inputMode: 'url' },
    { name: 'address', label: 'Address', multiline: true, placeholder: '123 Main St, City, State' },
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
  phone: { label: 'Phone', fields: [
    { name: 'phone', label: 'Phone number', type: 'tel', placeholder: '+15555550100', hint: 'Include the country code. Scanning opens the dialer.' },
  ] },
  location: { label: 'Location', fields: [
    { name: 'latitude', label: 'Latitude', inputMode: 'decimal', placeholder: '37.7749', half: true },
    { name: 'longitude', label: 'Longitude', inputMode: 'decimal', placeholder: '-122.4194', half: true },
    { name: 'label', label: 'Label', placeholder: 'Optional' },
  ] },
  event: { label: 'Event', fields: [
    { name: 'title', label: 'Title', placeholder: 'Team meeting' },
    { name: 'start', label: 'Starts', type: 'datetime-local', hint: 'Times use your device’s time zone.', half: true },
    { name: 'end', label: 'Ends (optional)', type: 'datetime-local', half: true },
    { name: 'location', label: 'Location', placeholder: 'Optional' },
    { name: 'description', label: 'Description', multiline: true, placeholder: 'Optional' },
  ] },
};

const valuesByType = Object.fromEntries(Object.entries(types).map(([key, { fields }]) =>
  [key, Object.fromEntries(fields.map(field => [
    field.name, field.type === 'checkbox' ? false : '',
  ]))]
));
valuesByType.url.url = 'https://example.com';
valuesByType.wifi.security = 'WPA';

const get = (id) => document.getElementById(id);
const fields = get('fields');
const previewCanvas = get('qr');
const exportCanvas = document.createElement('canvas');
const download = get('download');
const downloadSvg = get('download-svg');
const logoFile = get('logo-file');
const logoError = get('logo-error');
const uploadMark = get('upload-mark');
const removeLogo = get('remove-logo');
const logoControls = get('logo-controls');
const logoSize = get('logo-size');
const logoSizeValue = get('logo-size-value');
const qrPaper = get('qr-paper');
const appearance = get('appearance');
const foreground = get('qr-color');
const background = get('qr-background');
const transparent = get('qr-transparent');
let type = 'url';
let logo = null;
let transparentBackground = false;
let uploadGeneration = 0;
let exportArtwork;

get('choices').innerHTML = Object.entries(types).map(([key, config]) =>
  '<label class="choice"><input type="radio" name="type" value="' + key + '"' +
  (key === type ? ' checked' : '') + '><span>' + icon(key) + config.label + '</span></label>'
).join('');
uploadMark.innerHTML = icon('upload');
download.innerHTML = icon('download') + 'Download PNG';
downloadSvg.innerHTML = icon('download') + 'Download SVG';

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
    const control = document.createElement(field.options ? 'select' : field.multiline ? 'textarea' : 'input');
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
    if (field.hint) {
      const hint = document.createElement('small');
      hint.id = control.id + '-hint';
      hint.textContent = field.hint;
      control.setAttribute('aria-describedby', hint.id);
      row.append(hint);
    }
    fields.append(row);
  }
}

function boxPath(x, y, size, radius = 0) {
  if (!radius) return `M${x} ${y}h${size}v${size}h-${size}z`;
  const side = size - radius * 2;
  const corner = `a${radius} ${radius} 0 0 1`;
  return `M${x + radius} ${y}h${side}${corner} ${radius} ${radius}v${side}${corner} -${radius} ${radius}h-${side}${corner} -${radius} -${radius}v-${side}${corner} ${radius} -${radius}z`;
}

function circlePath(x, y, radius) {
  const diameter = radius * 2;
  return `M${x - radius} ${y}a${radius} ${radius} 0 1 0 ${diameter} 0a${radius} ${radius} 0 1 0 -${diameter} 0z`;
}

function modulePath(matrix, shape, outerEye, innerEye) {
  const eyes = outerEye === 'square' && innerEye === 'square'
    ? []
    : [[0, 0], [0, matrix.size - 7], [matrix.size - 7, 0]];
  const paths = [];
  for (let row = 0; row < matrix.size; row++) {
    for (let column = 0; column < matrix.size; column++) {
      if (!matrix.get(row, column) || eyes.some(([top, left]) =>
        row >= top && row < top + 7 && column >= left && column < left + 7
      )) continue;
      if (shape === 'square' || matrix.isReserved(row, column)) {
        paths.push(boxPath(column, row, 1));
      } else if (shape === 'rounded') {
        paths.push(boxPath(column, row, 1, .28));
      } else {
        paths.push(circlePath(column + .5, row + .5, .48));
      }
    }
  }
  const outerRadius = outerEye === 'dot' ? 3.5 : outerEye === 'rounded' ? 1.65 : 0;
  for (const [row, column] of eyes) {
    paths.push(
      boxPath(column, row, 7, outerRadius),
      boxPath(column + 1, row + 1, 5, Math.max(0, outerRadius - 1)),
      innerEye === 'dot'
        ? circlePath(column + 3.5, row + 3.5, 1.5)
        : boxPath(column + 2, row + 2, 3, innerEye === 'rounded' ? .45 : 0),
    );
  }
  return paths.join('');
}

function drawCode(text) {
  const matrix = QRCode.create(text, { errorCorrectionLevel: logo ? 'H' : 'M' }).modules;
  const size = 1024;
  const scale = Math.floor(size / (matrix.size + 8));
  const symbolSize = matrix.size * scale;
  const offset = Math.floor((size - symbolSize) / 2);
  exportCanvas.width = exportCanvas.height = size;
  const ctx = exportCanvas.getContext('2d');
  const backgroundColor = transparentBackground ? null : background.value;
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, size, size);
  }
  const moduleShape = appearance.querySelector('[name="qr-shape"]:checked').value;
  const outerEye = appearance.querySelector('[name="eye-style"]:checked').value;
  const innerEye = appearance.querySelector('[name="eye-inner-style"]:checked').value;
  const path = modulePath(matrix, moduleShape, outerEye, innerEye);
  const color = foreground.value;
  ctx.fillStyle = color;
  ctx.setTransform(scale, 0, 0, scale, offset, offset);
  ctx.fill(new Path2D(path), 'evenodd');
  ctx.resetTransform();
  exportArtwork = { size, offset, scale, path, color, backgroundColor, logo: null };
  if (logo) {
    const logoSide = symbolSize * logoSize.valueAsNumber / 100;
    const plate = logoSide + symbolSize * .02;
    const start = (size - plate) / 2;
    const fit = logoSide / Math.max(logo.naturalWidth, logo.naturalHeight);
    const width = logo.naturalWidth * fit;
    const height = logo.naturalHeight * fit;
    if (backgroundColor) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(start, start, plate, plate);
    } else {
      ctx.clearRect(start, start, plate, plate);
    }
    const x = (size - width) / 2;
    const y = (size - height) / 2;
    ctx.drawImage(logo, x, y, width, height);
    exportArtwork.logo = { image: logo, x, y, width, height, start, plate };
  }

  previewCanvas.width = previewCanvas.height = symbolSize;
  previewCanvas.getContext('2d').drawImage(
    exportCanvas, offset, offset, symbolSize, symbolSize,
    0, 0, symbolSize, symbolSize,
  );
  qrPaper.style.backgroundColor = backgroundColor || '';
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
  downloadSvg.disabled = Boolean(message);
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
function setBackgroundTransparency(value) {
  transparentBackground = value;
  transparent.setAttribute('aria-pressed', String(value));
  qrPaper.classList.toggle('transparent', value);
}

transparent.addEventListener('click', () => {
  setBackgroundTransparency(!transparentBackground);
  updatePreview();
});

appearance.addEventListener('input', ({ target }) => {
  if (target === background) setBackgroundTransparency(false);
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
    logoControls.hidden = false;
    updatePreview();
  } catch {
    if (generation === uploadGeneration) showLogoError('This image could not be opened. Try another file.');
  } finally {
    URL.revokeObjectURL(url);
  }
});

logoSize.addEventListener('input', () => {
  const percentage = logoSize.value + '%';
  logoSizeValue.value = percentage;
  logoSize.setAttribute('aria-valuetext', percentage);
  updatePreview();
});

removeLogo.addEventListener('click', () => {
  uploadGeneration++;
  logo = null;
  uploadMark.innerHTML = icon('upload');
  get('upload-title').textContent = 'Upload a logo';
  get('upload-hint').textContent = 'PNG, JPG, WebP or GIF · Up to 5 MB';
  logoControls.hidden = true;
  showLogoError('');
  get('upload-button').focus();
  updatePreview();
});

function saveDownload(href, extension) {
  const link = document.createElement('a');
  link.download = 'qr-' + type + '.' + extension;
  link.href = href;
  link.click();
}

function createSvg({ size, offset, scale, path, color, backgroundColor, logo }) {
  const layers = [`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`];
  if (backgroundColor) layers.push(`<rect width="${size}" height="${size}" fill="${backgroundColor}"/>`);
  const modules = `<path d="${path}" fill="${color}" fill-rule="evenodd" transform="translate(${offset} ${offset}) scale(${scale})"/>`;
  if (logo) {
    const { image, x, y, width, height, start, plate } = logo;
    const cutout = boxPath(0, 0, size) + boxPath(start, start, plate);
    layers.push(
      `<defs><clipPath id="qr-cutout"><path d="${cutout}" clip-rule="evenodd"/></clipPath></defs>`,
      `<g clip-path="url(#qr-cutout)">${modules}</g>`,
    );
    const bitmap = document.createElement('canvas');
    bitmap.width = Math.max(1, Math.round(width));
    bitmap.height = Math.max(1, Math.round(height));
    bitmap.getContext('2d').drawImage(image, 0, 0, bitmap.width, bitmap.height);
    layers.push(`<image x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="none" href="${bitmap.toDataURL('image/png')}"/>`);
  } else {
    layers.push(modules);
  }
  layers.push('</svg>');
  return layers.join('');
}

download.addEventListener('click', () => saveDownload(exportCanvas.toDataURL('image/png'), 'png'));
downloadSvg.addEventListener('click', () => {
  const file = new Blob([createSvg(exportArtwork)], { type: 'image/svg+xml' });
  const href = URL.createObjectURL(file);
  saveDownload(href, 'svg');
  setTimeout(() => URL.revokeObjectURL(href), 1000);
});

renderFields();
updatePreview();
