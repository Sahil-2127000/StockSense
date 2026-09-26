// Writes the code emails to HTML files so you can open them in a browser: npm run email:preview
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { codeEmail } from '../utils/emailTemplates.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stocksense-emails-'));
for (const purpose of ['EMAIL_VERIFICATION', 'PASSWORD_RESET']) {
  const mail = codeEmail({ purpose, fullName: 'Purvika Jain', email: 'purvika@example.com', code: '482913', minutes: 10 });
  const file = path.join(dir, `${purpose.toLowerCase()}.html`);
  fs.writeFileSync(file, mail.html);
  console.log(`${mail.subject}\n  → file://${file}`);
}
