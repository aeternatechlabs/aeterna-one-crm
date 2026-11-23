import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Search,
  MapPin,
  ChevronDown,
  Bell,
  LogOut,
  User,
  GraduationCap,
  Workflow,
  Check,
  Lock,
  Loader2,
} from 'lucide-react';
import { useDebounce } from 'devil-frontend';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { BRANCH_LABELS, BRANCHES } from '../../config/constants';
import { useAnimatedCaret } from '../../hooks/useAnimatedCaret';
import { pipelineService } from '../../services/pipeline.service';
import { useNotifications, useNotificationMutations } from '../../hooks/useNotificationQueries';

export const Header = ({ onToggleSidebar, isSidebarOpen = false }) => {
  const { user, logout } = useAuth();
  const { selectedBranch, setSelectedBranch, isBranchSwitchable } = useBranch();
  const navigate = useNavigate();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  // Notifications State & Popover
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const notifMenuRef = useRef(null);

  // TanStack Query Cached Notifications & Mutations (Rule 12)
  const {
    notifications,
    unreadCount,
    refetch: refetchNotifications,
  } = useNotifications({ limit: 10 });
  const { markAsRead, markAllAsRead } = useNotificationMutations();

  // Branch Selector Dropdown State
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const branchMenuRef = useRef(null);

  // Global Search State & Devil useDebounce
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchMeasureRef = useRef(null);
  const searchBoxRef = useRef(null);
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const searchCaret = useAnimatedCaret({
    inputRef: searchInputRef,
    containerRef: searchContainerRef,
    measureRef: searchMeasureRef,
    value: searchValue,
  });

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'S';
  const activeBranchDisplay = BRANCH_LABELS[selectedBranch] || BRANCH_LABELS[user?.branch] || 'Bengaluru';

  // Debounced Search Callback via devil-frontend useDebounce (300ms)
  const debouncedSearch = useDebounce(async (term) => {
    if (!term || !term.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await pipelineService.globalSearch({
        query: term.trim(),
        branch: selectedBranch,
      });
      const data = res?.results || res?.data?.results || [];
      setSearchResults(data);
      setShowSearchResults(true);
    } catch (err) {
      console.error('Global search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, 300);

  // Handle Search Input Change
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchValue(val);
    if (!val.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
    } else {
      setShowSearchResults(true);
      debouncedSearch(val);
    }
    requestAnimationFrame(() => searchCaret.updateCaret(e.target));
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await markAsRead(notif._id);
      } catch (err) {
        console.warn('Failed to mark notification as read:', err.message);
      }
    }
    setShowNotifMenu(false);
    if (notif.actionLink) {
      navigate(notif.actionLink);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
    } catch (err) {
      console.warn('Failed to mark all as read:', err.message);
    }
  };

  // Keyboard shortcut: Ctrl+K / Cmd+K to focus search; Escape to close dropdowns
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setShowSearchResults(false);
        setShowBranchMenu(false);
        setShowUserMenu(false);
        setShowNotifMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside listener for all dropdowns (Search, Branch, User, Notifications)
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
      if (branchMenuRef.current && !branchMenuRef.current.contains(e.target)) {
        setShowBranchMenu(false);
      }
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleSelectResult = (item) => {
    setShowSearchResults(false);
    setSearchValue('');
    if (item.link) {
      navigate(item.link);
    }
  };

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

        <div ref={searchBoxRef} className="header-search-box" style={{ position: 'relative' }}>
          <span className="search-icon" aria-hidden="true">
            <Search size={15} strokeWidth={2} />
          </span>
          <div ref={searchContainerRef} className="header-search-wrapper">
            <input
              ref={searchInputRef}
              type="text"
              className="header-search-input"
              placeholder="Search lead, student or application..."
              aria-label="Search leads, students or applications"
              value={searchValue}
              onChange={handleSearchChange}
              onFocus={(e) => {
                if (searchValue.trim()) setShowSearchResults(true);
                requestAnimationFrame(() => searchCaret.updateCaret(e.target));
              }}
              onBlur={() => searchCaret.hideCaret()}
              onKeyUp={(e) => {
                requestAnimationFrame(() => searchCaret.updateCaret(e.target));
              }}
              onClick={(e) => {
                requestAnimationFrame(() => searchCaret.updateCaret(e.target));
              }}
            />
            <span
              ref={searchMeasureRef}
              aria-hidden="true"
              className="input-measure-span"
            />
            <span
              className={`animated-caret ${searchCaret.isTyping ? 'typing' : 'blinking'}`}
              style={{
                transform: `translateX(${searchCaret.caretX}px) translateY(-50%)`,
                opacity: searchCaret.caretOpacity,
              }}
              aria-hidden="true"
            />
          </div>
          <span className="search-shortcut-pill" title="Press Ctrl + K to focus search">
            Ctrl + K
          </span>

          {/* Floating Debounced Search Results Popup */}
          {showSearchResults && searchValue.trim() && (
            <div
              className="select-dropdown-menu search-results-popup"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                width: '100%',
                minWidth: '380px',
                maxWidth: '480px',
                background: 'var(--color-bg-surface, #ffffff)',
                border: '1px solid var(--color-border-subtle, #e2e8f0)',
                borderRadius: '12px',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.16)',
                zIndex: 1000,
                padding: '6px',
                maxHeight: '380px',
                overflowY: 'auto',
              }}
              role="listbox"
              aria-label="Search Results"
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderBottom: '1px solid var(--color-border-subtle, #f1f5f9)',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--color-text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <span>
                  Search Results {searchResults.length > 0 && `(${searchResults.length})`}
                </span>
                {isSearching && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-maroon-800)' }}>
                    <Loader2 size={12} className="animate-spin" />
                    Searching...
                  </span>
                )}
              </div>

              {isSearching && searchResults.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  Searching leads and students across {activeBranchDisplay}...
                </div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  No records found matching "{searchValue}"
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                  {searchResults.map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      onClick={() => handleSelectResult(item)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                        width: '100%',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--color-gold-50, #fefce8)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: item.type === 'student' ? 'rgba(32, 197, 216, 0.15)' : 'rgba(128, 0, 32, 0.1)',
                            color: item.type === 'student' ? '#0891b2' : 'var(--color-maroon-850)',
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {item.type === 'student' ? (
                            <GraduationCap size={15} strokeWidth={2} />
                          ) : (
                            <Workflow size={15} strokeWidth={2} />
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '13px',
                              color: 'var(--color-text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {item.name}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-text-secondary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {item.studentId ? `${item.studentId} • ` : ''}
                            {item.detail}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'var(--color-gold-100, #fef9c3)',
                            color: 'var(--color-maroon-900)',
                            textTransform: 'uppercase',
                          }}
                        >
                          {item.branch ? item.branch.slice(0, 3).toUpperCase() : 'HQ'}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'var(--color-bg-canvas, #f1f5f9)',
                            color: 'var(--color-text-secondary)',
                            textTransform: 'capitalize',
                          }}
                        >
                          {item.badge ? String(item.badge).replace(/_/g, ' ') : item.type}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Branch Selector Pill, Notifications Bell, User Avatar */}
      <div className="header-right">
        {/* Active Branch Pill & Dropdown Switcher */}
        <div ref={branchMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className="header-branch-pill"
            onClick={() => {
              if (isBranchSwitchable) {
                setShowBranchMenu((prev) => !prev);
              }
            }}
            title={
              isBranchSwitchable
                ? `Active Operating Branch: ${activeBranchDisplay} (Click to switch branch view)`
                : `Active Operating Branch: ${activeBranchDisplay} (Locked to your assigned branch)`
            }
            aria-expanded={showBranchMenu}
            aria-haspopup="true"
            style={{
              cursor: isBranchSwitchable ? 'pointer' : 'default',
              border: isBranchSwitchable ? '1px solid var(--color-gold-400)' : '1px solid var(--color-border-subtle)',
            }}
          >
            <MapPin size={13} strokeWidth={2.2} className="header-branch-icon" />
            <span>{activeBranchDisplay}</span>
            {isBranchSwitchable ? (
              <ChevronDown
                size={12}
                strokeWidth={2}
                style={{
                  opacity: 0.8,
                  transform: showBranchMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s ease',
                }}
              />
            ) : (
              <Lock size={10} strokeWidth={2.5} style={{ opacity: 0.5 }} />
            )}
          </button>

          {/* Interactive Branch Switcher Dropdown */}
          {showBranchMenu && isBranchSwitchable && (
            <div
              className="select-dropdown-menu select-dropdown-right"
              style={{
                top: '46px',
                right: '0',
                minWidth: '200px',
                zIndex: 1000,
                boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
              }}
              role="menu"
            >
              <div
                style={{
                  padding: '8px 10px',
                  borderBottom: '1px solid var(--color-border-subtle)',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--color-text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Switch Operating Branch
              </div>

              {[
                { key: BRANCHES.ALL, label: 'All Branches' },
                { key: BRANCHES.BENGALURU, label: 'Bengaluru (HQ)' },
                { key: BRANCHES.MYSURU, label: 'Mysuru' },
                { key: BRANCHES.BELAGAVI, label: 'Belagavi' },
              ].map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => {
                    setSelectedBranch(b.key);
                    setShowBranchMenu(false);
                  }}
                  className={`dropdown-item ${selectedBranch === b.key ? 'selected' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    fontWeight: selectedBranch === b.key ? 700 : 500,
                    color: selectedBranch === b.key ? 'var(--color-maroon-850)' : 'var(--color-text-primary)',
                  }}
                >
                  <span>{b.label}</span>
                  {selectedBranch === b.key && <Check size={14} strokeWidth={2.5} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification Bell with Dropdown Menu */}
        <div ref={notifMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className="header-bell-btn"
            onClick={() => setShowNotifMenu((prev) => !prev)}
            aria-label={`Notifications (${unreadCount} unread)`}
            title="Notifications"
          >
            <Bell size={16} strokeWidth={2} />
            {unreadCount > 0 && (
              <span
                className="header-bell-dot"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#ffffff',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#dc2626',
                  top: '-4px',
                  right: '-4px',
                  position: 'absolute',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div
              className="select-dropdown-menu select-dropdown-right"
              style={{
                top: '48px',
                right: '0',
                width: '320px',
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '0',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '8px',
              }}
            >
              {/* Dropdown Header */}
              <div
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--color-border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--color-cream-100)',
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: '13px',
                    color: 'var(--color-maroon-850)',
                  }}
                >
                  Notifications {unreadCount > 0 && `(${unreadCount})`}
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--color-gold-700)',
                      cursor: 'pointer',
                      padding: '2px 4px',
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification Items */}
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div
                    style={{
                      padding: '24px 16px',
                      textAlign: 'center',
                      color: 'var(--color-text-secondary)',
                      fontSize: '12px',
                    }}
                  >
                    No notifications right now
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => handleNotificationClick(n)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--color-border-subtle)',
                        cursor: 'pointer',
                        background: n.isRead ? 'transparent' : 'rgba(90, 12, 30, 0.04)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(90, 12, 30, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(90, 12, 30, 0.04)';
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '2px',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: n.isRead ? 600 : 700,
                            fontSize: '12px',
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {n.title}
                        </span>
                        {!n.isRead && (
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: '#dc2626',
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--color-text-secondary)',
                          lineHeight: 1.4,
                        }}
                      >
                        {n.message}
                      </div>
                      <div
                        style={{
                          fontSize: '10px',
                          color: '#888',
                          marginTop: '4px',
                        }}
                      >
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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

