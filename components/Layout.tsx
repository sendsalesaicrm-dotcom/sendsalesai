import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex bg-background dark:bg-gray-900 min-h-screen transition-colors duration-300">
      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8 overflow-y-auto h-dvh">
        {/* Mobile header */}
        <div className="md:hidden sticky top-0 z-30 -mx-4 px-4 py-3 bg-background/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-200 dark:border-gray-800 mb-4">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
          >
            <Menu className="w-5 h-5" />
            Menu
          </button>
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;