import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { LiveNotificationToast } from '../common/LiveNotificationToast';
import styles from './AppLayout.module.css';

export const AppLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  
  return <div className={styles.shell}>
    <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    <main className={styles.main}>
      <Header onOpenSidebar={() => setIsSidebarOpen(true)} />
      <div className={styles.content}>
        <div key={location.pathname} className={styles.pageTransition}>
          <Outlet />
        </div>
      </div>
    </main>
    <LiveNotificationToast />
  </div>;
};
