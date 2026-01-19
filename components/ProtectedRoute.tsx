import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const FAVICON_AUTHENTICATED_URL = 'https://ohgcufkcrpehkvxavmhw.supabase.co/storage/v1/object/public/logo/x.png';
const FAVICON_DEFAULT_URL = 'https://ohgcufkcrpehkvxavmhw.supabase.co/storage/v1/object/public/logo/logo%20(1).png';

function setFavicon(url: string) {
  const existing = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (existing) {
    existing.href = url;
    return;
  }

  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = url;
  document.head.appendChild(link);
}

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      setFavicon(FAVICON_AUTHENTICATED_URL);
      return () => setFavicon(FAVICON_DEFAULT_URL);
    }

    setFavicon(FAVICON_DEFAULT_URL);
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;