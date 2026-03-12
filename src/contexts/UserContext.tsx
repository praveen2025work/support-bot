'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { UserInfo } from '@/types/user-types';

interface UserContextValue {
  userInfo: UserInfo | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

const UserContext = createContext<UserContextValue>({
  userInfo: null,
  isAdmin: false,
  loading: true,
  error: null,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchUserInfo() {
      try {
        const res = await fetch('/api/userinfo', {
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data: UserInfo = await res.json();
        if (!cancelled) {
          setUserInfo(data);
          setError(null);
        }

        // Check admin status after getting user identity
        try {
          const adminRes = await fetch('/api/admin/auth', {
            credentials: 'include',
          });
          if (adminRes.ok) {
            const adminData = await adminRes.json();
            if (!cancelled) {
              setIsAdmin(adminData.isAdmin === true);
            }
          }
        } catch {
          // Admin check failed — default to non-admin
          if (!cancelled) setIsAdmin(false);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to load user info';
          setError(msg);
          // Fallback for dev
          if (process.env.NODE_ENV === 'development') {
            setUserInfo({
              samAccountName: 'dev_user',
              displayName: 'Dev User',
              emailAddress: 'dev@localhost',
              employeeId: 'DEV001',
              givenName: 'Dev',
              surname: 'User',
              userName: 'LOCAL\\dev_user',
            });
            setIsAdmin(false);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchUserInfo();
    return () => { cancelled = true; };
  }, []);

  return (
    <UserContext.Provider value={{ userInfo, isAdmin, loading, error }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
