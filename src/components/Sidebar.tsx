import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  FaChartLine,
  FaBoxes,
  FaArrowDown,
  FaArrowUp,
  FaFileAlt,
  FaTimes,
  FaSignOutAlt,
  FaTruck,
  FaUsers,
  FaMoneyBillWave,
  FaShippingFast,
} from 'react-icons/fa';
import { FaWheatAwn } from 'react-icons/fa6';

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isMobile = false, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Beranda', icon: FaChartLine, color: 'text-blue-600' },
    { path: '/rice-types', label: 'Data Master Beras', icon: FaWheatAwn, color: 'text-amber-600' },
    { path: '/suppliers', label: 'Data Master Pemasok', icon: FaTruck, color: 'text-orange-600' },
    { path: '/destinations', label: 'Data Master Pelanggan', icon: FaUsers, color: 'text-cyan-600' },
    { path: '/incoming', label: 'Pemasukan Beras', icon: FaArrowDown, color: 'text-green-600' },
    { path: '/outgoing', label: 'Penjualan Beras', icon: FaArrowUp, color: 'text-red-600' },
    { path: '/debt', label: 'Utang', icon: FaMoneyBillWave, color: 'text-amber-600' },
    { path: '/delivery-orders', label: 'Order Pengantaran', icon: FaShippingFast, color: 'text-teal-600' },
    { path: '/stock', label: 'Manajemen Stok', icon: FaBoxes, color: 'text-indigo-600' },
    // { path: '/reports', label: 'Laporan', icon: FaFileAlt, color: 'text-purple-600' },
  ];

  return (
    <div className="flex flex-col h-full justify-between overflow-y-auto">
      {/* Logo */}
      <div className={`flex items-center justify-between flex-shrink-0 px-6 py-4 lg:py-6 ${isMobile ? 'border-b border-gray-200' : ''}`}>
        <h1 className="text-xl font-semibold text-gray-900">Gudang Konda</h1>
        {/* Close button - only visible on mobile */}
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 transition-colors duration-200 lg:hidden"
            aria-disabled="true"
          >
            <FaTimes className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`group flex items-center px-4 py-5 text-sm font-medium transition-colors duration-200 ${isActive
                ? 'bg-primary-50 text-primary-700 border-r-[3px] border-primary-700'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <IconComponent
                className={`mr-3 flex-shrink-0 h-5 w-5 transition-colors duration-200 ${isActive ? item.color : 'text-gray-400 group-hover:text-gray-500'
                  }`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info and logout */}
      <div className="flex-shrink-0 flex border-t border-gray-200 px-4 py-4">
        <div className="flex items-center w-full">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">
              {user?.name || user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="ml-2 flex-shrink-0 p-2 text-gray-400 hover:text-gray-500 rounded-md transition-colors duration-200"
            title="Keluar"
          >
            <FaSignOutAlt className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
