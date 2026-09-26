import { useRef } from 'react';

// Six single-digit boxes; typing or pasting moves focus along
export default function OtpInput({ value, onChange, autoFocus = true }) {
  const refs = useRef([]);
  const digits = value.padEnd(6, ' ').slice(0, 6).split('');

  const setAt = (index, digit) => {
    const next = digits.map((d, i) => (i === index ? digit : d)).join('');
    onChange(next.replace(/ /g, ''));
  };

  return (
    <div
      className="otp"
      onPaste={(e) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted) {
          e.preventDefault();
          onChange(pasted);
          refs.current[Math.min(pasted.length, 5)]?.focus();
        }
      }}
    >
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={d.trim()}
          aria-label={`Digit ${i + 1}`}
          autoFocus={autoFocus && i === 0}
          onChange={(e) => {
            const digit = e.target.value.replace(/\D/g, '').slice(-1);
            setAt(i, digit || ' ');
            if (digit) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => e.key === 'Backspace' && !d.trim() && refs.current[i - 1]?.focus()}
        />
      ))}
    </div>
  );
}
