import React, { useState } from 'react';
import { Search, Bell, Building2, LogOut, Menu, Plus } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import styles from './Header.module.css';
import { currentUser } from '../../data/mockData';
import { SearchModal } from '../common/SearchModal';
import { useAuth } from '../../context/AuthContext';
import { useComunicados } from '../../context/ComunicadosContext';

interface HeaderProps { onOpenSidebar: () => void; }

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const navigate = useNavigate();
  const { activeCompany, logout, switchCompany, user } = useAuth();
  const { comunicados } = useComunicados();
  const unreadCount = comunicados.filter(c => !c.read).length;
  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  return <>
    <header className={styles.header}>
      <div className={styles.brandGroup}>
        <button type="button" className={styles.menuButton} onClick={onOpenSidebar} aria-label="Abrir menu de navegação"><Menu size={18}/></button>
        <NavLink to="/" className={styles.brand}><span className={styles.brandMark}>C</span><span>central<span>.</span></span></NavLink>
      </div>
      <nav className={styles.primaryNav} aria-label="Navegação principal">
        <NavLink to="/" end>Início</NavLink><NavLink to="/comunicados">Mural</NavLink><NavLink to="/documentos">Documentos</NavLink><NavLink to="/suporte">Chamados</NavLink>
      </nav>
      <div className={styles.rightSection}>
        <button type="button" className={styles.searchTrigger} onClick={() => setIsSearchOpen(true)}><Search size={15}/><span>Buscar</span></button>
        <label className={styles.companySwitcher}><Building2 size={14}/><span className="sr-only">Empresa ativa</span><select value={activeCompany?.id ?? ''} onChange={event => switchCompany(event.target.value)} aria-label="Empresa ativa">{user?.companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
        <button type="button" className={styles.iconButton} aria-label={`Ver ${unreadCount} notificações`} onClick={() => navigate('/pendencias')}><Bell size={16}/>{unreadCount > 0 && <span className={styles.notificationBadge}>{unreadCount}</span>}</button>
        <button type="button" className={styles.createButton} onClick={() => navigate('/admin/novo-comunicado')}><Plus size={15}/><span>Criar</span></button>
        <div className={styles.userProfile}><img src={currentUser.avatar} alt={currentUser.name} className={styles.userAvatar}/><div className={styles.userInfo}><span>{user?.name?.split(' ')[0] ?? 'Usuário'}</span><small>{activeCompany?.membership.role ?? currentUser.role}</small></div></div>
        <button type="button" className={styles.logoutButton} onClick={handleLogout} aria-label="Sair da Central"><LogOut size={15}/><span>Sair</span></button>
      </div>
    </header>
    <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)}/>
  </>;
};
