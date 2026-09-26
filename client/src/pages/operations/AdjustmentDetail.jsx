import { Link, useParams } from 'react-router-dom';
import { ErrorState, Loading } from '../../components/Feedback.jsx';
import StatusPill from '../../components/StatusPill.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { operationsService } from '../../services/operations.service.js';
import { formatDateTime, formatQty } from '../../utils/format.js';

export default function AdjustmentDetail() {
  const { id } = useParams();
  const op = useApi(() => operationsService.get(id), [id]);
  useDocumentTitle(op.data?.reference);
  if (op.error) return <div className="view"><ErrorState error={op.error} onRetry={op.reload} /></div>;
  if (!op.data) return <div className="view"><Loading /></div>;
  const o = op.data;
  const gain = o.sourceLocation.type === 'ADJUSTMENT';
  const line = o.lines[0];
  return (
    <div className="view" style={{ maxWidth: 720 }}>
      <div className="crumb"><Link to="/adjustments">Adjustments</Link> › <b>{o.reference}</b></div>
      <div className="doc">
        <div className="doc-body">
          <div className="doc-ref"><span className="mono">{o.reference}</span><StatusPill status={o.status} /></div>
          <div className="grid2">
            <div className="fld"><label>Product</label><b>{line.product.name} <span className="mono muted">{line.product.sku}</span></b></div>
            <div className="fld"><label>Location</label><span className="mono">{gain ? o.destLocation.fullPath : o.sourceLocation.fullPath}</span></div>
            <div className="fld"><label>Change</label><b className={gain ? 'qin' : 'qout'}>{gain ? '+' : '−'}{formatQty(line.quantity, line.product.uom)} ({gain ? 'gain' : 'loss'})</b></div>
            <div className="fld"><label>Done</label><span>{formatDateTime(o.doneAt)} · {o.responsible.fullName}</span></div>
            <div className="fld" style={{ gridColumn: '1 / -1' }}><label>Reason</label><span>{o.notes || '—'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
