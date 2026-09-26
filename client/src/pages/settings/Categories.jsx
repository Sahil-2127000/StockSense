import CrudPage from '../../components/CrudPage.jsx';
import { categoriesService } from '../../services/crud.service.js';

export default function Categories() {
  const config = {
    singular: 'category',
    plural: 'Categories',
    sub: 'Group products for filtering and reports.',
    icon: 'tag',
    service: categoriesService,
    title: (r) => r.name,
    deleteMessage: 'Categories used by products cannot be deleted.',
    columns: [
      { key: 'name', label: 'Name', render: (r) => <b>{r.name}</b> },
      { key: 'count', label: 'Products', align: 'right', render: (r) => <span className="num">{r._count?.products ?? 0}</span> },
    ],
    fields: [{ name: 'name', label: 'Name', required: true, maxLength: 40, validate: (v) => v.length < 2 && 'At least 2 characters' }],
    toForm: (r) => ({ name: r?.name ?? '' }),
    toBody: (f) => ({ name: f.name.trim() }),
  };
  return <CrudPage config={config} />;
}
