import { describe, expect, it } from 'vitest';
import { codeEmail, escapeHtml } from '../utils/emailTemplates.js';

const base = { fullName: 'Purvika Jain', email: 'purvika@example.com', code: '482913', minutes: 10 };

describe('code email template', () => {
  it.each([
    ['EMAIL_VERIFICATION', 'verification code', 'Verify your email'],
    ['PASSWORD_RESET', 'password reset code', 'Reset your password'],
  ])('%s has the code in the subject, text and HTML', (purpose, subjectPart, title) => {
    const mail = codeEmail({ ...base, purpose });

    expect(mail.subject).toBe(`482913 is your StockSense ${subjectPart}`);
    expect(mail.text).toContain('482913');
    expect(mail.text).toContain('Hi Purvika,');
    expect(mail.html).toContain(title);
    // one box per digit
    ['4', '8', '2', '9', '1', '3'].forEach((digit) => expect(mail.html).toContain(`>${digit}</div>`));
    expect(mail.html).toContain('10 minutes');
  });

  it('escapes user-provided text so it cannot inject HTML', () => {
    const mail = codeEmail({ ...base, purpose: 'EMAIL_VERIFICATION', fullName: '<img src=x onerror=alert(1)> Evil' });

    expect(mail.html).not.toContain('<img src=x');
    expect(mail.html).toContain('&lt;img');
    expect(escapeHtml('"\'&<>')).toBe('&quot;&#39;&amp;&lt;&gt;');
  });
});
