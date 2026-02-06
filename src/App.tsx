import React from 'react';
import { useApp } from './context/AppContext';
import { MarketingHome } from './components/MarketingHome';
import { DashboardLayout } from './components/DashboardLayout';

const App: React.FC = () => {
  const { currentView } = useApp();

  return (
    <>
      {currentView === 'marketing' ? (
        <MarketingHome />
      ) : (
        <DashboardLayout />
      )}
    </>
  );
};

export default App;
