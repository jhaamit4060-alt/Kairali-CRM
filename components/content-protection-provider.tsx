'use client';

import { ReactNode, useState, useEffect } from 'react';
import useCopyProtection from '@/hooks/use-copy-protection';

interface ContentProtectionProviderProps {
  children: ReactNode;
}

export default function ContentProtectionProvider({ children }: ContentProtectionProviderProps) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get user role from localStorage
    try {
      const userDataString = localStorage.getItem('kairali_user');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        setUserRole(userData?.role || null);
      }
    } catch (error) {
      console.error('Error reading user role:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ✅ Check if user is super_admin
  const isSuperAdmin = userRole === 'super_admin';

  // Apply protection only if NOT super_admin
  useCopyProtection(
    isSuperAdmin
      ? {
          // 🔓 No protection for super_admin
          disableRightClick: false,
          disableCopy: false,
          disableCut: false,
          enablePaste: true,
          disableTextSelection: false,
          disableDevTools: false,
          disablePrint: false,
          showAlert: false,
        }
      : {
          // 🔒 Full protection for other users
          disableRightClick: true,
          disableCopy: true,
          disableCut: true,
          enablePaste: true,
          disableTextSelection: true,
          disableDevTools: false,
          disablePrint: false,
          showAlert: false,
          onAttempt: (action) => {
            if (process.env.NODE_ENV === 'development') {
              console.log(`🛡️ Protection triggered: ${action} (Role: ${userRole})`);
            }
          },
        }
  );

  return <>{children}</>;
}