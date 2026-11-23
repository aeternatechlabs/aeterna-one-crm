import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Target,
  GitBranch,
  GraduationCap,
  CheckSquare,
  BarChart3,
  Settings,
  Users,
  Trash2,
  School,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from '../../config/constants';
import aeternaLogo from '../../assets/brand/logo.webp';
import sidebarHeritageImg from '../../assets/heritage/sidebar-heritage.webp';

const NAV_ICON_MAP = {
  LayoutDashboard,
  Target,
  GitBranch,
  GraduationCap,
  CheckSquare,
  BarChart3,
  Settings,
  Users,
  Trash2,
  School,
};

export const Sidebar = ({ isOpen = false, onClose }) => {
  const { user } = useAuth();

  const userRole = user?.role;

  // Filter navigation items by current user's role
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true;
    return userRole && item.roles.includes(userRole);
  });

  const handleLinkClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onClose?.();
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      {/* Brand Header */}
      <div className="brand-header">
        <div className="brand-logo" aria-label="Aeterna Monogram">
          <img
            src={aeternaLogo}
            alt="Aeterna Emblem"
            className="brand-logo-img"
          />
        </div>
        <div className="brand-info">
          <span className="brand-name">AETERNA ONE</span>
          <span className="brand-tagline">— STUDY ABROAD CRM —</span>
        </div>

        {/* Mobile Close Button */}
        {onClose && (
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close navigation sidebar"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        )}
      </div>

      {/* Navigation Section */}
      <div className="nav-section-label">WORKSPACE</div>
      <nav className="nav-menu">
        {visibleNavItems.map((item) => {
          const IconComponent = NAV_ICON_MAP[item.iconName] || LayoutDashboard;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={Boolean(item.end ?? (item.path === '/employees' || item.path === '/'))}
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              <span className="nav-icon" aria-hidden="true">
                <IconComponent size={18} strokeWidth={2} />
              </span>
              <span className="nav-text">{item.label}</span>
              {item.plannedPhase && (
                <span className="nav-pill-badge">{item.plannedPhase}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Heritage Vidhana Soudha Footer with Karnataka Hubs Graphic */}
      <div className="sidebar-heritage-footer">
        <img
          src={sidebarHeritageImg}
          alt="Bengaluru • Mysuru • Belagavi Heritage"
          className="sidebar-heritage-img"
        />
      </div>
    </aside>
  );
};
