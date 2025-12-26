import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, MessageSquare, Server } from 'lucide-react';

const SettingsOverview: React.FC = () => {
  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
        <Link to="general" className="rounded-2xl border-2 border-green-900/60 p-12 hover:shadow-md transition text-center bg-white dark:bg-gray-800">
          <Globe className="mx-auto w-8 h-8 text-primary mb-4" />
          <div className="text-xl font-bold text-primary">Geral</div>
        </Link>
        <Link to="meta" className="rounded-2xl border-2 border-green-900/60 p-12 hover:shadow-md transition text-center bg-white dark:bg-gray-800">
          <MessageSquare className="mx-auto w-8 h-8 text-secondary mb-4" />
          <div className="text-xl font-bold text-primary">Meta API</div>
        </Link>
        <Link to="evolution" className="rounded-2xl border-2 border-green-900/60 p-12 hover:shadow-md transition text-center bg-white dark:bg-gray-800">
          <Server className="mx-auto w-8 h-8 text-blue-600 mb-4" />
          <div className="text-xl font-bold text-primary">Evolution API</div>
        </Link>
      </div>
    </div>
  );
};

export default SettingsOverview;
