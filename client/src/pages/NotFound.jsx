import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <div className="not-found">
      <h1>404</h1>
      <p className="muted">This page does not exist.</p>
      <Link to="/" className="btn pri">Go to the dashboard</Link>
    </div>
  );
}
