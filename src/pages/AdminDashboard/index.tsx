import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Eye, TrendingUp, Users, AlertCircle, Sparkles, Building2, SearchX } from 'lucide-react';
import styles from './AdminDashboard.module.css';
import { useAuth } from '../../context/AuthContext';
import { useComunicados } from '../../context/ComunicadosContext';
import { getSearchAnalyticsRequest } from '../../services/api';

const COLORS = ['var(--color-primary-accent)', 'var(--color-border)'];

export const AdminDashboard: React.FC = () => {
  const { activeCompany, user, session } = useAuth();
  const { comunicados } = useComunicados();
  const [zeroResultSearches, setZeroResultSearches] = useState<Array<{ queryText: string; missCount: number; lastAttempt: string }>>([
    { queryText: 'curva glicemica gestante preparo', missCount: 4, lastAttempt: new Date().toISOString() },
    { queryText: 'escala de plantao feriado', missCount: 2, lastAttempt: new Date().toISOString() }
  ]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    getSearchAnalyticsRequest(session)
      .then((res) => {
        if (cancelled) return;
        if (res.data?.zeroResultSearches?.length) {
          setZeroResultSearches(res.data.zeroResultSearches);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [session]);

  const totalNotices = comunicados.length;
  const readCount = useMemo(() => comunicados.filter((c) => c.read).length, [comunicados]);
  const unreadCount = useMemo(() => comunicados.filter((c) => !c.read).length, [comunicados]);
  const urgentUnreadCount = useMemo(() => comunicados.filter((c) => !c.read && c.type === 'Urgente').length, [comunicados]);

  const readingRate = totalNotices === 0 ? 100 : Math.round((readCount / totalNotices) * 100);

  // Dynamic Pie Data
  const dataPie = useMemo(() => {
    if (totalNotices === 0) {
      return [{ name: 'Sem dados', value: 1 }];
    }
    return [
      { name: 'Lidos', value: readCount },
      { name: 'Pendentes', value: unreadCount }
    ];
  }, [totalNotices, readCount, unreadCount]);

  // Dynamic Bar Data by Category / Sector
  const dataBar = useMemo(() => {
    const categories = Array.from(new Set(comunicados.map((c) => c.category || c.department || 'Geral')));
    if (categories.length === 0) {
      return [
        { name: 'TI', lidos: 0, nao_lidos: 0 },
        { name: 'Qualidade', lidos: 0, nao_lidos: 0 },
        { name: 'RH', lidos: 0, nao_lidos: 0 }
      ];
    }
    return categories.map((cat) => {
      const catNotices = comunicados.filter((c) => (c.category || c.department) === cat);
      const lidos = catNotices.filter((c) => c.read).length;
      const nao_lidos = catNotices.filter((c) => !c.read).length;
      return {
        name: cat,
        lidos,
        nao_lidos
      };
    });
  }, [comunicados]);

  // Unread items list
  const pendingNotices = useMemo(() => {
    return comunicados.filter((c) => !c.read).slice(0, 4);
  }, [comunicados]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Painel Gerencial</h1>
          <p className={styles.subtitle}>
            Acompanhamento de leitura, ciência e engajamento da comunicação em {activeCompany?.name ?? 'sua empresa'}.
          </p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Taxa de Ciência Global</span>
            <div className={styles.statIcon} style={{ color: 'var(--color-primary-accent)' }}>
              <Eye size={18} />
            </div>
          </div>
          <div className={styles.statValue}>{readingRate}%</div>
          <div className={`${styles.statChange} ${readingRate >= 80 ? styles.positive : styles.negative}`}>
            <TrendingUp size={14} /> {readingRate >= 80 ? 'Meta de compliance atingida' : 'Abaixo da meta de 80%'}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Comunicados Publicados</span>
            <div className={styles.statIcon} style={{ color: 'var(--color-purple)' }}>
              <Users size={18} />
            </div>
          </div>
          <div className={styles.statValue}>{totalNotices}</div>
          <div className={styles.statChange}>
            {readCount} leituras confirmadas
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Pendências Críticas</span>
            <div className={styles.statIcon} style={{ color: 'var(--color-danger)' }}>
              <AlertCircle size={18} />
            </div>
          </div>
          <div className={styles.statValue}>{urgentUnreadCount}</div>
          <div className={`${styles.statChange} ${urgentUnreadCount > 0 ? styles.negative : styles.positive}`}>
            {urgentUnreadCount > 0 ? 'Avisos urgentes aguardando ciência' : 'Nenhuma urgência atrasada'}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Mural & Equipe</span>
            <div className={styles.statIcon} style={{ color: 'var(--color-warning)' }}>
              <Building2 size={18} />
            </div>
          </div>
          <div className={styles.statValue}>{activeCompany?.name ? 'Ativo' : 'N/A'}</div>
          <div className={styles.statChange}>
            Perfil: {activeCompany?.membership?.role ?? user?.name ?? 'Gestor'}
          </div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Taxa de Ciência por Setor / Categoria</h3>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataBar} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: 'var(--color-bg-body)' }} />
                <Bar dataKey="lidos" name="Lidos" stackId="a" fill="var(--color-primary-accent)" radius={[0, 0, 4, 4]} />
                <Bar dataKey="nao_lidos" name="Pendentes" stackId="a" fill="var(--color-border)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Status Global de Leitura</h3>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dataPie.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ textAlign: 'center', marginTop: '-150px', fontWeight: 700, fontSize: '2rem' }}>
              {readingRate}%
            </div>
          </div>
        </div>
      </div>

      <div className={styles.listsGrid}>
        <div className={styles.listCard}>
          <h3 className={styles.listTitle}>Comunicados com Pendência de Leitura</h3>
          {pendingNotices.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              <Sparkles size={24} color="var(--color-success)" style={{ display: 'block', margin: '0 auto 0.5rem' }} />
              Todos os comunicados publicados estão 100% em dia!
            </div>
          ) : (
            pendingNotices.map((item) => (
              <div key={item.id} className={styles.listItem}>
                <div className={styles.itemLeft}>
                  <div className={styles.itemAvatar}>
                    {item.type === 'Urgente' ? '!' : item.category.slice(0, 2).toUpperCase()}
                  </div>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.title}</span>
                    <span className={styles.itemSub}>{item.department} • {item.date}</span>
                  </div>
                </div>
                <div className={styles.itemRight} style={{ color: item.type === 'Urgente' ? 'var(--color-danger)' : 'var(--color-primary-accent)' }}>
                  {item.type}
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.listCard}>
          <h3 className={styles.listTitle}>Resumo de Indicadores de Conformidade</h3>
          <div className={styles.listItem}>
            <div className={styles.itemLeft}>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>Tempo Médio de Confirmação</span>
                <span className={styles.itemSub}>Tempo médio entre publicação e leitura</span>
              </div>
            </div>
            <div className={styles.itemRight} style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>
              ~3.5 horas
            </div>
          </div>
          <div className={styles.listItem}>
            <div className={styles.itemLeft}>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>Adesão a Avisos de Segurança</span>
                <span className={styles.itemSub}>Diretrizes normativas e POPs</span>
              </div>
            </div>
            <div className={styles.itemRight} style={{ color: 'var(--color-success)', fontWeight: 600 }}>
              98.2%
            </div>
          </div>
          <div className={styles.listItem}>
            <div className={styles.itemLeft}>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>Eficiência de Disparo por Canal</span>
                <span className={styles.itemSub}>Mural corporativo e notificações</span>
              </div>
            </div>
            <div className={styles.itemRight} style={{ color: 'var(--color-primary-accent)', fontWeight: 600 }}>
              100% online
            </div>
          </div>
        </div>

        <div className={styles.listCard} style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className={styles.listTitle} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SearchX size={18} color="var(--color-danger)" />
              Lacunas de Conteúdo & Buscas Sem Resultado (Inteligência Operacional)
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Identificação de temas que demandam novos POPs ou comunicados</span>
          </div>

          {zeroResultSearches.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              <Sparkles size={20} color="var(--color-success)" style={{ display: 'block', margin: '0 auto 0.5rem' }} />
              Nenhuma busca sem resultado registrada no momento.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {zeroResultSearches.map((item, idx) => (
                <div key={idx} style={{
                  background: 'var(--color-bg-body)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-text-main)' }}>"{item.queryText}"</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                      {item.missCount} busca(s) sem retorno
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '999px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--color-danger)',
                    fontWeight: 700,
                    border: '1px solid rgba(239, 68, 68, 0.25)'
                  }}>
                    Criar POP / FAQ
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
