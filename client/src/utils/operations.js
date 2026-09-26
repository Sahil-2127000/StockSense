// "Desk × 10, +1 more"
export const linesSummary = (lines) => {
  if (!lines?.length) return '—';
  const [first, ...rest] = lines;
  return `${first.product.name} × ${Number(first.quantity)}${rest.length ? `, +${rest.length} more` : ''}`;
};
