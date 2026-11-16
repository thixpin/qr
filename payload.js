const escapeWifi = (value) => value.replace(/[\\;,:"]/g, '\\$&');
const escapeContact = (value) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, '\\$&');

const validEmail = (value) => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(value);

export function createPayload(type, values) {
  if (type === 'url') {
    const input = values.url.trim();
    if (!input) return { message: 'Enter a website URL to see its QR code.' };
    try {
      const candidate = /^[a-z][a-z\d+.-]*:/i.test(input) && !/:\d+(?:[/?#]|$)/.test(input)
        ? input
        : 'https://' + input;
      const url = new URL(candidate);
      if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) {
        return { text: url.href };
      }
    } catch {
      return { message: 'Enter a valid website URL.' };
    }
    return { message: 'Enter a valid HTTP or HTTPS URL.' };
  }
  if (type === 'contact') {
    const first = values.first.trim();
    const last = values.last.trim();
    const phone = values.phone.trim();
    const email = values.email.trim();
    const organization = values.organization.trim();
    if (!first && !last && !phone && !email && !organization) {
      return { message: 'Add a name or contact detail to see its QR code.' };
    }
    if (email && !validEmail(email)) return { message: 'Enter a valid contact email address.' };
    const name = [first, last].filter(Boolean).join(' ') || organization || email || phone;
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:' + escapeContact(last) + ';' + escapeContact(first) + ';;;',
      'FN:' + escapeContact(name),
    ];
    if (phone) lines.push('TEL;TYPE=CELL:' + escapeContact(phone));
    if (email) lines.push('EMAIL:' + escapeContact(email));
    if (organization) lines.push('ORG:' + escapeContact(organization));
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
  const params = [];
  if (values.subject) params.push('subject=' + encodeURIComponent(values.subject));
  if (values.body) params.push('body=' + encodeURIComponent(values.body.replace(/\r?\n/g, '\r\n')));
  return { text: 'mailto:' + address + (params.length ? '?' + params.join('&') : '') };
}
