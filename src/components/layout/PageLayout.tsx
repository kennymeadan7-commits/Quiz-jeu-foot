import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

const NAV_ITEMS = [
  { to: '/', label: 'Tableau de bord' },
  { to: '/classes', label: 'Classes' },
  { to: '/students', label: 'Élèves' },
  { to: '/subjects', label: 'Matières' },
  { to: '/grades', label: 'Notes' },
  { to: '/settings', label: 'Paramètres' },
];

export function PageLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-primary-700 text-white p-6">
        <h1 className="text-xl font-bold mb-8">Moyennes Scolaires</h1>
        <nav className="space-y-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`block rounded-lg px-4 py-2 transition-colors ${
                location.pathname === item.to
                  ? 'bg-primary-600 font-semibold'
                  : 'hover:bg-primary-600/60'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
