import { Link, useParams } from 'react-router-dom';
import { ErrorState, Loading } from '../../components/Feedback.jsx';
import Icon from '../../components/Icon.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { operationsService } from '../../services/operations.service.js';
import { OPERATION_TYPES, operationPath } from '../../utils/constants.js';
import { formatDateTime, formatQty } from '../../utils/format.js';

// Printable receipt / delivery slip (available once the operation is Done)
export default function PrintSlip() {
  const { id } = useParams();
  const op = useApi(() => operationsService.get(id), [id]);
  useDocumentTitle(op.data ? `${op.data.reference} slip` : 'Slip');

  if (op.error) return <div className="print-page"><ErrorState error={op.error} onRetry={op.reload} /></div>;
  if (!op.data) return <div className="print-page"><Loading /></div>;
  const o = op.data;
  const meta = OPERATION_TYPES[o.type];
  const total = o.lines.reduce((sum, l) => sum + Number(l.quantity), 0);

  return (
    <div className="print-page">
      <div className="no-print" style={{ display: 'flex', gap: 8 }}>
        <Link to={operationPath(o)} className="btn"><Icon name="left" /> Back</Link>
        <button type="button" className="btn pri" onClick={() => window.print()}><Icon name="printer" /> Print</button>
      </div>
      <div className="slip">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="logo" style={{ padding: 0 }}>
            <Icon name="cube" style={{ width: 28, height: 28 }} />
            <b style={{ font: "750 18px 'Bricolage Grotesque', sans-serif" }}>StockSense</b>
          </div>
          <span className="mono">{o.reference}</span>
        </div>
        <h1>{meta.label} slip</h1>
        <hr />
        <div className="grid2">
          <div className="fld"><label>{meta.contactLabel ?? 'Contact'}</label><b>{o.contact?.name ?? '—'}</b>{o.contact?.address && <span className="help">{o.contact.address}</span>}</div>
          <div className="fld"><label>Date</label><b>{formatDateTime(o.doneAt ?? o.scheduleDate)}</b></div>
          <div className="fld"><label>From</label><span className="mono">{o.sourceLocation.fullPath}</span></div>
          <div className="fld"><label>To</label><span className="mono">{o.destLocation.fullPath}</span></div>
        </div>
        <table className="t" style={{ minWidth: 0 }}>
          <thead><tr><th>Product</th><th>SKU</th><th className="r">Quantity</th></tr></thead>
          <tbody>
            {o.lines.map((l) => (
              <tr key={l.id}><td>{l.product.name}</td><td className="mono">{l.product.sku}</td><td className="r num">{formatQty(l.quantity, l.product.uom)}</td></tr>
            ))}
          </tbody>
        </table>
        <hr />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total units</span><b className="num">{formatQty(total)}</b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, gap: 20 }}>
          <span className="muted">Responsible: {o.responsible.fullName}</span>
          <span className="muted">Signature: ____________________</span>
        </div>
      </div>
    </div>
  );
}
