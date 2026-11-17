import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  X,
  Search,
  MapPin,
  ChevronDown,
  Bell,
  LogOut,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BRANCH_LABELS } from '../../config/constants';

export const Header = ({ onToggleSidebar, isSidebarOpen = false }) => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'S';
  const branchName = BRANCH_LABELS[user?.branch] || 'Bengaluru (HQ)';

  // Click outside to close user dropdown menu
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showUserMenu]);

  return (
    <header className="top-header">
      {/* Left: Mobile Toggle & Global Search Box */}
      <div className="header-left">
        {onToggleSidebar && (
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isSidebarOpen}
          >
            {isSidebarOpen ? (
              <X size={18} strokeWidth={2.2} />
            ) : (
              <Menu size={18} strokeWidth={2.2} />
            )}
          </button>
        )}

        <div className="header-search-box">
          <span className="search-icon" aria-hidden="true">
            <Search size={15} strokeWidth={2} />
          </span>
          <input
            type="text"
            className="header-search-input"
            placeholder="Search lead, student or application..."
            aria-label="Search leads, students or applications"
          />
          <span className="search-shortcut-pill">Ctrl + K</span>
        </div>
      </div>

      {/* Right: Branch Pill, Notifications Bell, User Avatar */}
      <div className="header-right">
        {/* Active Branch Pill */}
        <div
          className="header-branch-pill"
          title={`Active Operating Branch: ${branchName}`}
        >
          <MapPin size={13} strokeWidth={2.2} className="header-branch-icon" />
          <span>{branchName}</span>
          <ChevronDown size={12} strokeWidth={2} style={{ opacity: 0.7 }} />
        </div>

        {/* Notification Bell with Red Dot */}
        <button
          type="button"
          className="header-bell-btn"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={16} strokeWidth={2} />
          <span className="header-bell-dot" />
        </button>

        {/* User Avatar Circle with Dropdown Menu for Sign Out */}
        <div ref={userMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className="header-user-avatar"
            onClick={() => setShowUserMenu((prev) => !prev)}
            aria-label={`User menu for ${user?.name || 'Staff'}`}
            title={`${user?.name || 'User'} (${user?.role || 'Staff'}) — Click for options`}
          >
            {userInitial}
          </button>

          {showUserMenu && (
            <div
              className="select-dropdown-menu select-dropdown-right"
              style={{
                top: '48px',
                right: '0',
                minWidth: '190px',
              }}
            >
              <div
                style={{
                  padding: '8px 10px',
                  borderBottom: '1px solid var(--color-border-subtle)',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <User size={16} strokeWidth={2} style={{ color: 'var(--color-maroon-850)' }} />
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '13px',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {user?.name || 'Sachin'}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {user?.role || 'Staff'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="dropdown-item"
                style={{ color: 'var(--color-danger)' }}
              >
                <LogOut size={13} strokeWidth={2} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
