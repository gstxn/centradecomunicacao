import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  Clock,
  FileText,
  Gauge,
  Globe,
  Headphones,
  HelpCircle,
  LayoutGrid,
  MessageSquare,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Sun,
  Moon
} from 'lucide-react';
import styles from './Sidebar.module.css';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useComunicados } from '../../context/ComunicadosContext';
import type { PermissionKey } from '../../services/api';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { icon: LayoutGrid, label: 'Visão geral', detail: 'Seu dia de trabalho', path: '/' },
  { icon: MessageSquare, label: 'Mural', detail: 'Comunicados e ciência', path: '/comunicados', badge: '05' },
  { icon: Globe, label: 'Links Rápidos', detail: 'Sistemas oficiais homologados', path: '/links' },
  { icon: HelpCircle, label: 'Conhecimento / FAQ', detail: 'Dúvidas e procedimentos', path: '/conhecimento' },
  { icon: FileText, label: 'Documentos', detail: 'Biblioteca corporativa', path: '/documentos' },
  { icon: Headphones, label: 'Chamados', detail: 'Suporte e solicitações', path: '/suporte' },
];

const workspace = [
  { icon: Globe, label: 'Links Rápidos', path: '/links' },
  { icon: Clock, label: 'Pendências', path: '/pendencias' },
  { icon: CalendarDays, label: 'Agenda', path: '/calendario' },
  { icon: BookOpen, label: 'Minhas leituras', path: '/leituras' },
  { icon: BarChart3, label: 'Relatórios', path: '/relatorios' },
];

const management = [
  { icon: Headphones, label: 'Monitoramento', path: '/admin/chamados', permission: 'support.manage' },
  { icon: Building2, label: 'Empresa e pessoas', path: '/admin/empresa', permission: 'users.view' },
  { icon: Gauge, label: 'Indicadores', path: '/admin/indicadores', permission: 'reports.view' },
  { icon: Plus, label: 'Novo comunicado', path: '/admin/novo-comunicado', permission: 'notices.create' },
] satisfies Array<{ icon: typeof Headphones; label: string; path: string; permission: PermissionKey }>;

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { activeCompany } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { comunicados } = useComunicados();
  const managementItems = management.filter((item) =>
    activeCompany?.membership?.permissions?.includes(item.permission)
  );
  const unreadCount = comunicados.filter((c) => !c.read).length;

  const closeAfterNavigation = () => onClose();

  return (
    <>
      <button
        type="button"
        className={`${styles.overlay} ${isOpen ? styles.visible : ''}`}
        onClick={onClose}
        aria-label="Fechar menu"
      />
      <aside className={`${styles.drawer} ${isOpen ? styles.open : ''}`} aria-hidden={!isOpen}>
        <header className={styles.drawerHeader}>
          <div className={styles.identity}>
            <span className={styles.mark}>C</span>
            <div>
              <strong>central.</strong>
              <small>WORKPLACE OS</small>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className={styles.closeButton}
              onClick={toggleTheme}
              aria-label="Trocar tema"
              title={`Mudar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Fechar navegação"
            >
              <X size={17} />
              <kbd>ESC</kbd>
            </button>
          </div>
        </header>

        <div className={styles.companyContext}>
          <div className={styles.companyIcon}>
            <Building2 size={17} />
          </div>
          <div>
            <small>ESPAÇO ATIVO</small>
            <strong>{activeCompany?.name ?? 'Sua empresa'}</strong>
          </div>
          <span className={styles.online}>
            <i /> ONLINE
          </span>
        </div>

        <div className={styles.drawerBody}>
          <section className={styles.navGroup}>
            <div className={styles.groupTitle}>
              <span>NAVEGAÇÃO</span>
              <span>01</span>
            </div>
            <nav>
              {navigation.map((item) => {
                let badge = item.badge;
                if (item.path === '/comunicados') {
                  badge =
                    unreadCount > 0
                      ? unreadCount < 10
                        ? `0${unreadCount}`
                        : unreadCount.toString()
                      : undefined;
                }
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={closeAfterNavigation}
                    className={({ isActive }) =>
                      `${styles.mainLink} ${isActive ? styles.active : ''}`
                    }
                  >
                    <span className={styles.linkIcon}>
                      <item.icon size={16} />
                    </span>
                    <span className={styles.linkCopy}>
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </span>
                    {badge && <span className={styles.badge}>{badge}</span>}
                    <ChevronRight className={styles.arrow} size={14} />
                  </NavLink>
                );
              })}
            </nav>
          </section>

          <div className={styles.splitGroups}>
            <section className={styles.navGroup}>
              <div className={styles.groupTitle}>
                <span>MEU ESPAÇO</span>
                <span>02</span>
              </div>
              <nav>
                {workspace.map((item) => {
                  const showBadge = item.path === '/pendencias' && unreadCount > 0;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={closeAfterNavigation}
                      className={({ isActive }) =>
                        `${styles.compactLink} ${isActive ? styles.active : ''}`
                      }
                      style={{ justifyContent: 'space-between' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <item.icon size={14} />
                        <span>{item.label}</span>
                      </div>
                      {showBadge && (
                        <span
                          className={styles.badge}
                          style={{
                            padding: '1px 5px',
                            borderRadius: '8px',
                            fontSize: '9px'
                          }}
                        >
                          {unreadCount}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </section>
            {managementItems.length > 0 && (
              <section className={styles.navGroup}>
                <div className={styles.groupTitle}>
                  <span>GESTÃO</span>
                  <span>03</span>
                </div>
                <nav>
                  {managementItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={closeAfterNavigation}
                      className={({ isActive }) =>
                        `${styles.compactLink} ${isActive ? styles.active : ''}`
                      }
                    >
                      <item.icon size={14} />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </nav>
              </section>
            )}
          </div>

          <section className={styles.channels}>
            <div className={styles.groupTitle}>
              <span>CANAIS</span>
              <span>04</span>
            </div>
            <div>
              <NavLink to="/cat/qualidade" onClick={closeAfterNavigation}>
                <ShieldCheck size={12} /> Qualidade
              </NavLink>
              <NavLink to="/cat/rh" onClick={closeAfterNavigation}>
                <Users size={12} /> Pessoas
              </NavLink>
              <NavLink to="/cat/ti" onClick={closeAfterNavigation}>
                <Sparkles size={12} /> Tecnologia
              </NavLink>
            </div>
          </section>
        </div>

        <footer className={styles.drawerFooter}>
          <div className={styles.helpCopy}>
            <CircleHelp size={16} />
            <div>
              <strong>Algo saiu do lugar?</strong>
              <small>A gente encontra o caminho com você.</small>
            </div>
          </div>
          <NavLink to="/suporte" onClick={closeAfterNavigation} className={styles.helpAction}>
            <Plus size={14} /> Novo chamado
          </NavLink>
        </footer>
      </aside>
    </>
  );
};
