import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaBars } from 'react-icons/fa';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile backdrop */}
      <div
        className={`
          fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden transition-opacity duration-300
          ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar - Fixed on desktop, slide-in on mobile */}
      <aside
        className={`
          flex flex-col h-screen bg-white border-r border-gray-200
          fixed inset-y-0 left-0 z-50 w-80
          lg:translate-x-0 lg:w-64 lg:flex-shrink-0
          transform transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar isMobile onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content - offset by sidebar width on desktop */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden lg:ml-64">
        {/* Top bar - Mobile */}
        <div className="lg:hidden relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            onClick={() => setSidebarOpen(true)}
            className="px-4"
          >
            <FaBars className="h-6 w-6" />
          </button>
          <div className="flex-1 flex items-center justify-between px-4">
            <h1 className="text-lg font-semibold text-gray-900">Gudang Konda</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700 truncate max-w-[120px]">
                {user?.name || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
