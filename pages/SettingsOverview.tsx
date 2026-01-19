import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

const META_LOGO_URL = '/logo2.svg';
const EVOLUTION_LOGO_URL = '/evo1.svg';
const GENERAL_LOGO_URL = '/gear1.svg';

const SettingsOverview: React.FC = () => {
  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-stretch">
        <Link to="general" className="h-full min-h-[260px] rounded-2xl border-2 border-primary-dark/60 p-12 hover:shadow-md transition text-center bg-white dark:bg-gray-800 flex flex-col items-center justify-center">
          <img src={GENERAL_LOGO_URL} alt="Geral" className="mx-auto w-16 h-16 mb-6 object-contain" />
          <div className="text-xl font-bold text-primary">Geral</div>
        </Link>
        <Link to="meta" className="h-full min-h-[260px] rounded-2xl border-2 border-primary-dark/60 p-12 hover:shadow-md transition text-center bg-white dark:bg-gray-800 flex flex-col items-center justify-center">
          <img src={META_LOGO_URL} alt="Meta" className="mx-auto w-16 h-16 mb-6 object-contain" />
          <div className="text-xl font-bold text-primary">Meta API</div>
        </Link>
        <Link to="evolution" className="h-full min-h-[260px] rounded-2xl border-2 border-primary-dark/60 p-12 hover:shadow-md transition text-center bg-white dark:bg-gray-800 flex flex-col items-center justify-center">
          <img src={EVOLUTION_LOGO_URL} alt="Evolution" className="mx-auto w-16 h-16 mb-6 object-contain" />
          <div className="text-xl font-bold text-primary">Evolution API</div>
        </Link>
      </div>
    </div>
  );
};

export default SettingsOverview;
