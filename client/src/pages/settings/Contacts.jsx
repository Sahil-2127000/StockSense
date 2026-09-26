import { useState } from 'react';
import CrudPage from '../../components/CrudPage.jsx';
import { contactsService } from '../../services/crud.service.js';
import { EMAIL_RE } from '../../utils/constants.js';

export default function Contacts() {
  const [type, setType] = useState('');
  const config = {
    singular: 'contact',
    plural: 'Contacts',
    sub: 'Suppliers you receive from and customers you deliver to.',
    icon: 'book',
    service: contactsService,
    searchPlaceholder: 'Name, email or phone',
    title: (r) => r.name,
    deleteMessage: 'Contacts used in operations cannot be deleted.',
    columns: [
      { key: 'name', label: 'Name', render: (r) => <b>{r.name}</b> },
      { key: 'type', label: 'Type', render: (r) => <span className={`pill ${r.type === 'SUPPLIER' ? 'done' : 'ready'}`}>{r.type === 'SUPPLIER' ? 'Supplier' : 'Customer'}</span> },
      { key: 'email', label: 'Email', render: (r) => r.email ?? <span className="muted">—</span> },
      { key: 'phone', label: 'Phone', render: (r) => r.phone ?? <span className="muted">—</span> },
      { key: 'address', label: 'Address', render: (r) => <span className="ellipsis" style={{ display: 'inline-block' }}>{r.address ?? '—'}</span> },
    ],
    fields: [
      { name: 'name', label: 'Name', required: true, maxLength: 80, validate: (v) => v.length < 2 && 'At least 2 characters' },
      { name: 'type', label: 'Type', type: 'select', required: true, options: [{ value: 'SUPPLIER', label: 'Supplier' }, { value: 'CUSTOMER', label: 'Customer' }] },
      { name: 'email', label: 'Email', type: 'email', validate: (v) => v && !EMAIL_RE.test(v) && 'Enter a valid email address' },
      { name: 'phone', label: 'Phone', type: 'tel', validate: (v) => v && !/^\+?[0-9][0-9 -]{6,18}$/.test(v) && 'Enter a valid phone number' },
      { name: 'address', label: 'Address', type: 'textarea', maxLength: 200 },
    ],
    toForm: (r) => ({ name: r?.name ?? '', type: r?.type ?? type ?? '', email: r?.email ?? '', phone: r?.phone ?? '', address: r?.address ?? '' }),
    toBody: (f) => ({ name: f.name.trim(), type: f.type, email: f.email.trim(), phone: f.phone.trim(), address: f.address.trim() }),
  };
  return (
    <CrudPage
      config={config}
      filterValues={{ type: type || undefined }}
      filters={
        <div className="filters" role="group" aria-label="Contact type">
          {[['', 'All'], ['SUPPLIER', 'Suppliers'], ['CUSTOMER', 'Customers']].map(([value, label]) => (
            <button type="button" key={label} className={`chip${type === value ? ' on' : ''}`} onClick={() => setType(value)}>{label}</button>
          ))}
        </div>
      }
    />
  );
}
