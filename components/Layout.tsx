
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  HandCoins, 
  AlertCircle,
  Menu,
  X
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItemProps {
  to: string;
  icon: any;
  label: string;
  active: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon: Icon, label, active }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      active 
        ? 'bg-blue-600 text-white shadow-md' 
        : 'text-slate-600 hover:bg-slate-100'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </Link>
);

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  const navLinks = [
    { to: '/', icon: LayoutDashboard, label: 'Painel' },
    { to: '/borrowers', icon: Users, label: 'Clientes' },
    { to: '/loans', icon: HandCoins, label: 'Empréstimos' },
    { to: '/overdue', icon: AlertCircle, label: 'Atenção' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <HandCoins className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">CrediManager</h1>
        </div>
        
        <nav className="flex flex-col gap-1">
          {navLinks.map(link => (
            <NavItem 
              key={link.to} 
              {...link} 
              active={location.pathname === link.to} 
            />
          ))}
        </nav>
      </aside>

      {/* Mobile Nav */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <HandCoins className="text-blue-600" size={24} />
          <h1 className="text-lg font-bold text-slate-800">CrediManager</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-white z-40 pt-20 px-6">
          <nav className="flex flex-col gap-2">
            {navLinks.map(link => (
              <NavItem 
                key={link.to} 
                {...link} 
                active={location.pathname === link.to} 
              />
            ))}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-10 pt-20 lg:pt-10 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
};
