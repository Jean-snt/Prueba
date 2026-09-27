import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch (e) { localStorage.removeItem('user'); }
    }
    const handler = () => {
      const s = localStorage.getItem('user');
      if (s) { try { setUser(JSON.parse(s)); } catch (e) {} }
    };
    window.addEventListener('vipStatusChanged', handler);
    window.addEventListener('profileImageUpdated', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('vipStatusChanged', handler);
      window.removeEventListener('profileImageUpdated', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const merged = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(merged));
      return merged;
    });
    window.dispatchEvent(new CustomEvent('profileImageUpdated', { detail: updates }));
  }, []);

  return (
    <UserContext.Provider value={{ user, updateUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
