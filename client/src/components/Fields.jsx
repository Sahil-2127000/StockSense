import { useId, useState } from 'react';
import Icon from './Icon.jsx';

function FieldShell({ id, label, required, error, help, children }) {
  return (
    <div className="fld">
      {label && (
        <label htmlFor={id}>
          {label}
          {required && <span className="req" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <span className="help e" id={`${id}-err`}>{error}</span>
      ) : (
        help && <span className="help">{help}</span>
      )}
    </div>
  );
}

const describedBy = (id, error) => (error ? `${id}-err` : undefined);

export function TextField({ label, error, help, required, className = '', type = 'text', ...props }) {
  const id = useId();
  const [reveal, setReveal] = useState(false);
  const isPassword = type === 'password';
  const input = (
    <input
      id={id}
      type={isPassword && reveal ? 'text' : type}
      className={`inp ${error ? 'err' : ''} ${className}`}
      aria-invalid={Boolean(error)}
      aria-describedby={describedBy(id, error)}
      required={required}
      {...props}
    />
  );
  return (
    <FieldShell id={id} label={label} required={required} error={error} help={help}>
      {isPassword ? (
        <div className="inp-wrap">
          {input}
          <button type="button" className="icon-btn reveal" onClick={() => setReveal((v) => !v)} aria-label={reveal ? 'Hide password' : 'Show password'}>
            <Icon name="eye" />
          </button>
        </div>
      ) : (
        input
      )}
    </FieldShell>
  );
}

export function SelectField({ label, error, help, required, options = [], placeholder, className = '', ...props }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} required={required} error={error} help={help}>
      <select
        id={id}
        className={`inp ${error ? 'err' : ''} ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error)}
        required={required}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function TextAreaField({ label, error, help, required, ...props }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} required={required} error={error} help={help}>
      <textarea id={id} className={`inp ${error ? 'err' : ''}`} aria-invalid={Boolean(error)} required={required} {...props} />
    </FieldShell>
  );
}
