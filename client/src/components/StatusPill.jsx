import React from 'react';

const LABELS = {
  draft: 'Draft',
  waiting: 'Waiting',
  ready: 'Ready',
  done: 'Done',
  cancel: 'Cancelled',
  ok: 'In stock',
  low: 'Low stock',
  out: 'Out of stock',
};

export default function StatusPill({ status, label }) {
  return <span className={`pill ${status}`}>{label ?? LABELS[status] ?? status}</span>;
}