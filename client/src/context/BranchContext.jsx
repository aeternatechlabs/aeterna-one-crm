import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { BRANCHES, ROLES } from '../config/constants';

export const BranchContext = createContext(null);

export const BranchProvider = ({ children }) => {
  const { user } = useAuth();

  const [selectedBranch, setSelectedBranch] = useState(() => {
    try {
      const stored = localStorage.getItem('aeterna_active_branch');
      if (stored) return stored;
    } catch {
      // ignore storage error
    }
    return user?.role === ROLES.SUPER_ADMIN ? BRANCHES.ALL : (user?.branch || BRANCHES.BENGALURU);
  });

  // Keep branch state in sync if user changes or logs in/out
  useEffect(() => {
    if (user) {
      if (user.role !== ROLES.SUPER_ADMIN && user.branch && user.branch !== BRANCHES.ALL) {
        setSelectedBranch(user.branch);
      } else {
        try {
          const stored = localStorage.getItem('aeterna_active_branch');
          if (stored) {
            setSelectedBranch(stored);
          } else {
            setSelectedBranch(BRANCHES.ALL);
          }
        } catch {
          setSelectedBranch(BRANCHES.ALL);
        }
      }
    }
  }, [user]);

  const changeBranch = (newBranch) => {
    // If not super admin, branch cannot be switched outside user's assigned branch
    if (user?.role !== ROLES.SUPER_ADMIN && user?.branch !== BRANCHES.ALL) {
      return;
    }
    setSelectedBranch(newBranch);
    try {
      localStorage.setItem('aeterna_active_branch', newBranch);
    } catch {
      // ignore storage error
    }
  };

  const isBranchSwitchable = Boolean(
    user?.role === ROLES.SUPER_ADMIN || user?.branch === BRANCHES.ALL
  );

  return (
    <BranchContext.Provider
      value={{
        selectedBranch,
        setSelectedBranch: changeBranch,
        isBranchSwitchable,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) {
    return {
      selectedBranch: 'all',
      setSelectedBranch: () => {},
      isBranchSwitchable: false,
    };
  }
  return context;
};
