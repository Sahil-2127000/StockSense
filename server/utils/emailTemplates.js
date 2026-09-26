/*
 * Email templates in the StockSense design.
 * Email apps (Gmail, Outlook, Apple Mail) ignore <style> blocks and modern CSS, so the layout
 * uses tables and inline styles only. Every template returns { subject, text, html }:
 * the plain-text part is shown by apps that do not display HTML.
 */

const C = {
  page: '#F3F5F9',
  card: '#FFFFFF',
  ink: '#0E1726',
  ink2: '#2A3550',
  muted: '#66728A',
  line: '#E4E8F0',
  nav: '#0F1A30',
  accent: '#2F5BEA',
  accentSoft: '#EAF0FE',
  warnSoft: '#FEF3DD',
  warnInk: '#8A5503',
};
const FONT = "Manrope, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, monospace";

// User-provided text (like a name) must never be able to inject HTML into the email
export const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

const firstName = (fullName) => String(fullName).trim().split(/\s+/)[0] || 'there';

// The code as six separate boxes, easy to read and to copy
const codeBoxes = (code) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
    <tr>
      ${code
    .split('')
    .map(
      (digit) => `<td style="padding:0 3px;">
        <div style="width:40px;height:52px;text-align:center;background:${C.page};border:1px solid ${C.line};border-radius:10px;font:700 24px/52px ${MONO};color:${C.ink};">${digit}</div>
      </td>`
    )
    .join('')}
    </tr>
  </table>`;

const layout = ({ preheader, title, intro, code, minutes, note, email }) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
  <!-- Preview text shown in the inbox list, hidden in the email itself -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
    <tr>
      <td align="center" style="padding:24px 10px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:${C.card};border:1px solid ${C.line};border-radius:16px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:${C.nav};padding:20px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width:30px;height:30px;background:${C.accent};border-radius:8px;text-align:center;vertical-align:middle;font:800 16px ${FONT};color:#FFFFFF;">S</td>
                  <td style="padding-left:10px;">
                    <div style="font:800 18px ${FONT};color:#FFFFFF;letter-spacing:-0.3px;line-height:1.1;">StockSense</div>
                    <div style="font:500 11px ${FONT};color:#7F8BA6;line-height:1.4;">Inventory &amp; warehouse</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 24px 8px;font-family:${FONT};">
              <h1 style="margin:0 0 12px;font:800 24px ${FONT};color:${C.ink};letter-spacing:-0.4px;">${title}</h1>
              <p style="margin:0 0 24px;font:500 15px/1.6 ${FONT};color:${C.ink2};">${intro}</p>
              ${codeBoxes(code)}
              <p style="margin:18px 0 0;text-align:center;font:600 13px ${FONT};color:${C.muted};">
                This code expires in <b style="color:${C.ink};">${minutes} minutes</b>.
              </p>
            </td>
          </tr>

          <!-- Security note -->
          <tr>
            <td style="padding:24px 24px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.warnSoft};border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;font:500 13px/1.55 ${FONT};color:${C.warnInk};">
                    <b>Keep this code private.</b> StockSense will never ask you for it by phone, chat or email.
                    ${note}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:22px 24px 26px;border-top:1px solid ${C.line};font:500 12px/1.6 ${FONT};color:${C.muted};">
              This email was sent to <span style="color:${C.ink2};">${email}</span> because of activity on your StockSense account.<br>
              StockSense · Inventory Management System
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const COPY = {
  EMAIL_VERIFICATION: {
    subject: (code) => `${code} is your StockSense verification code`,
    title: 'Verify your email',
    intro: (name) => `Hi ${name}, welcome to StockSense! Enter this code to confirm your email address and finish creating your account.`,
    note: 'If you did not create an account, you can safely ignore this email.',
    textIntro: 'Welcome to StockSense! Use this code to confirm your email address:',
  },
  PASSWORD_RESET: {
    subject: (code) => `${code} is your StockSense password reset code`,
    title: 'Reset your password',
    intro: (name) => `Hi ${name}, we received a request to reset your StockSense password. Enter this code to choose a new one.`,
    note: 'If you did not ask to reset your password, you can ignore this email. Your password stays the same.',
    textIntro: 'We received a request to reset your StockSense password. Use this code to choose a new one:',
  },
};

/**
 * One-time code email.
 * @param purpose 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'
 */
export const codeEmail = ({ purpose, fullName, email, code, minutes }) => {
  const copy = COPY[purpose];
  const name = escapeHtml(firstName(fullName));
  return {
    subject: copy.subject(code),
    text: [
      `Hi ${firstName(fullName)},`,
      '',
      copy.textIntro,
      '',
      `    ${code}`,
      '',
      `The code expires in ${minutes} minutes. Never share it with anyone.`,
      copy.note,
      '',
      '— StockSense',
    ].join('\n'),
    html: layout({
      preheader: `Your code is ${code}. It expires in ${minutes} minutes.`,
      title: copy.title,
      intro: copy.intro(name),
      code,
      minutes,
      note: copy.note,
      email: escapeHtml(email),
    }),
  };
};
