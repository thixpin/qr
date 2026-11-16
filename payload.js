const escapeWifi = (value) => value.replace(/[\\;,:"]/g, '\\$&');
const escapeText = (value) => value.replace(/\\/g, '\\\\').replace(/\r\n|[\r\n]/g, '\\n').replace(/[,;]/g, '\\$&');

const validEmail = (value) => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(value);

function webUrl(input) {
  try {
    const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(input) && !/^[^:/?#]+:\d+(?:[/?#]|$)/.test(input);
    const url = new URL(hasScheme ? input : 'https://' + input);
    if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) return url.href;
  } catch {
    return null;
  }
  return null;
}

const calendarDate = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const encoder = new TextEncoder();
let lastEvent;

function foldCalendarLine(line) {
  if (encoder.encode(line).length <= 75) return line;
  let folded = '';
  let length = 0;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (length + bytes > 75) {
      folded += '\r\n ';
      length = 1;
    }
    folded += character;
    length += bytes;
  }
  return folded;
}

function eventPayload(values) {
  const title = values.title.trim();
  const start = new Date(values.start);
  const end = new Date(values.end);
  if (!title || !Number.isFinite(start.getTime())) return { message: 'Enter an event title and start time.' };
  if (values.end && (!Number.isFinite(end.getTime()) || end <= start)) {
    return { message: 'Choose an end time after the start time.' };
  }
  const details = ['DTSTART:' + calendarDate(start), 'SUMMARY:' + escapeText(title)];
  if (values.end) details.push('DTEND:' + calendarDate(end));
  if (values.location.trim()) details.push('LOCATION:' + escapeText(values.location.trim()));
  if (values.description.trim()) details.push('DESCRIPTION:' + escapeText(values.description.trim()));
  const key = details.join('\r\n');
  if (lastEvent?.key !== key) {
    lastEvent = { key, uid: crypto.randomUUID(), stamp: calendarDate(new Date()) };
  }

  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Little QR Studio//QR Event//EN', 'BEGIN:VEVENT',
    'UID:' + lastEvent.uid, 'DTSTAMP:' + lastEvent.stamp,
    ...details, 'END:VEVENT', 'END:VCALENDAR', '',
  ];
  return { text: lines.map(foldCalendarLine).join('\r\n') };
}

export function createPayload(type, values) {
  if (type === 'url') {
    const input = values.url.trim();
    if (!input) return { message: 'Enter a website URL to see its QR code.' };
    const url = webUrl(input);
    return url ? { text: url } : { message: 'Enter a valid HTTP or HTTPS URL.' };
  }
  if (type === 'text') {
    return values.text.trim() ? { text: values.text } : { message: 'Enter text to see its QR code.' };
  }
  if (type === 'phone') {
    const input = values.phone.trim();
    if (!input) return { message: 'Enter a phone number to see its QR code.' };
    const phone = input.replace(/[\s().-]/g, '');
    if (!/^\+?\d{3,15}$/.test(phone)) return { message: 'Enter a valid phone number.' };
    return { text: 'tel:' + phone };
  }
  if (type === 'location') {
    const lat = values.latitude.trim();
    const lon = values.longitude.trim();
    if (!lat || !lon) return { message: 'Enter latitude and longitude to see the location QR code.' };
    const coordinate = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
    if (!coordinate.test(lat) || !coordinate.test(lon) || Math.abs(Number(lat)) > 90 || Math.abs(Number(lon)) > 180) {
      return { message: 'Enter a latitude from −90 to 90 and a longitude from −180 to 180.' };
    }
    const normalize = value => value.replace(/^\+/, '').replace(/^(-?)\./, '$10.').replace(/\.$/, '');
    const point = normalize(lat) + ',' + normalize(lon);
    const label = values.label.trim();
    const query = label ? '?q=' + point + '(' + encodeURIComponent(label.toWellFormed()).replaceAll('(', '%28').replaceAll(')', '%29') + ')' : '';
    return { text: 'geo:' + point + query };
  }
  if (type === 'event') return eventPayload(values);
  if (type === 'contact') {
    const first = values.first.trim();
    const last = values.last.trim();
    const phone = values.phone.trim();
    const email = values.email.trim();
    const organization = values.organization.trim();
    const position = values.position?.trim();
    const workPhone = values.workPhone?.trim();
    const workEmail = values.workEmail?.trim();
    const website = values.website?.trim();
    const address = values.address?.trim();
    if (![first, last, phone, email, organization, position, workPhone, workEmail, website, address].some(Boolean)) {
      return { message: 'Add a name or contact detail to see its QR code.' };
    }
    if (email && !validEmail(email)) return { message: 'Enter a valid contact email address.' };
    if (workEmail && !validEmail(workEmail)) return { message: 'Enter a valid work email address.' };
    const contactUrl = website && webUrl(website);
    if (website && !contactUrl) return { message: 'Enter a valid contact website URL.' };
    const name = [first, last].filter(Boolean).join(' ') || organization || email || workEmail || phone || workPhone || position || contactUrl || address;
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:' + escapeText(last) + ';' + escapeText(first) + ';;;',
      'FN:' + escapeText(name),
    ];
    if (phone) lines.push('TEL;TYPE=CELL:' + escapeText(phone));
    if (workPhone) lines.push('TEL;TYPE=WORK,VOICE:' + escapeText(workPhone));
    if (email) lines.push('EMAIL:' + escapeText(email));
    if (workEmail) lines.push('EMAIL;TYPE=WORK,INTERNET:' + escapeText(workEmail));
    if (organization) lines.push('ORG:' + escapeText(organization));
    if (position) lines.push('TITLE:' + escapeText(position));
    if (contactUrl) lines.push('URL:' + contactUrl);
    if (address) lines.push('ADR:;;' + escapeText(address) + ';;;;');
    lines.push('END:VCARD');
    return { text: lines.join('\r\n') };
  }
  if (type === 'wifi') {
    if (!values.ssid) return { message: 'Enter your network name to see its QR code.' };
    if (values.security !== 'nopass' && !values.password) {
      return { message: 'Enter your Wi-Fi password to generate the code.' };
    }
    const password = values.security === 'nopass' ? '' : 'P:' + escapeWifi(values.password) + ';';
    const hidden = values.hidden ? 'H:true;' : '';
    return { text: 'WIFI:T:' + values.security + ';S:' + escapeWifi(values.ssid) + ';' + password + hidden + ';' };
  }
  const recipient = values.email.trim();
  if (!recipient) return { message: 'Enter a recipient to see the email QR code.' };
  if (!validEmail(recipient)) return { message: 'Enter a valid recipient email address.' };
  const address = encodeURIComponent(recipient).replace('%40', '@');
  return { text: 'mailto:' + address };
}
