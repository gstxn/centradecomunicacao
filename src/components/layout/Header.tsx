import React, { useState } from 'react';
import { Search, Bell, Building2, LogOut, Menu, Plus } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import styles from './Header.module.css';
import { SearchModal } from '../common/SearchModal';
import { NotificationDropdown } from './NotificationDropdown';
import { useAuth } from '../../context/AuthContext';
import { useComunicados } from '../../context/ComunicadosContext';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const navigate = useNavigate();
  const { activeCompany, logout, switchCompany, user } = useAuth();
  const { unreadCount, urgentCount } = useComunicados();
  const canPublish = Boolean(activeCompany?.membership?.permissions?.includes('notices.create'));

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <header className={styles.header}>
        <div className={styles.brandGroup}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={onOpenSidebar}
            aria-label="Abrir menu de navegação"
          >
            <Menu size={18} />
          </button>
          <NavLink to="/" className={styles.brand}>
            <span className={styles.brandMark}>C</span>
            <span>
              central<span>.</span>
            </span>
          </NavLink>
        </div>

        <nav className={styles.primaryNav} aria-label="Navegação principal">
          <NavLink to="/" end>
            Início
          </NavLink>
          <NavLink to="/comunicados">Mural</NavLink>
          <NavLink to="/links">Links Rápidos</NavLink>
          <NavLink to="/conhecimento">Conhecimento</NavLink>
          <NavLink to="/documentos">Documentos</NavLink>
          <NavLink to="/suporte">Chamados</NavLink>
        </nav>

        <div className={styles.rightSection}>
          <button
            type="button"
            className={styles.searchTrigger}
            onClick={() => setIsSearchOpen(true)}
          >
            <Search size={15} />
            <span>Buscar</span>
          </button>

          <label className={styles.companySwitcher}>
            <Building2 size={14} />
            <span className="sr-only">Empresa ativa</span>
            <select
              value={activeCompany?.id ?? ''}
              onChange={(event) => switchCompany(event.target.value)}
              aria-label="Empresa ativa"
            >
              {user?.companies?.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.notificationWrapper}>
            <button
              type="button"
              className={`${styles.iconButton} ${isNotificationsOpen ? styles.active : ''}`}
              aria-label={`Notificações: ${unreadCount} pendentes`}
              aria-expanded={isNotificationsOpen}
              aria-haspopup="dialog"
              onClick={() => setIsNotificationsOpen((prev) => !prev)}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span
                  className={`${styles.notificationBadge} ${urgentCount > 0 ? styles.urgent : ''}`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
            <NotificationDropdown
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
            />
          </div>

          {canPublish && (
            <button
              type="button"
              className={styles.createButton}
              onClick={() => navigate('/admin/novo-comunicado')}
            >
              <Plus size={15} />
              <span>Criar</span>
            </button>
          )}

          <div className={styles.userProfile}>
            <img src="/favicon.svg" alt="" className={styles.userAvatar} />
            <div className={styles.userInfo}>
              <span>{user?.name?.split(' ')[0] ?? 'Usuário'}</span>
              <small>{activeCompany?.membership?.role ?? 'sem perfil'}</small>
            </div>
          </div>

          <button
            type="button"
            className={styles.logoutButton}
            onClick={handleLogout}
            aria-label="Sair da Central"
          >
            <LogOut size={15} />
            <span>Sair</span>
          </button>
        </div>
      </header>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
