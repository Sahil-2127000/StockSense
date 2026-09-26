import { useCallback, useState } from 'react';

/**
 * Current page of a list that goes back to page 1 whenever `resetKey` changes
 * (e.g. a new search or filter), without an extra render from an effect.
 */
export function usePage(resetKey) {
  const [state, setState] = useState({ key: resetKey, page: 1 });
  const page = state.key === resetKey ? state.page : 1;
  const setPage = useCallback((next) => setState({ key: resetKey, page: next }), [resetKey]);
  return [page, setPage];
}
