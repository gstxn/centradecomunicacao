import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Eye, TrendingUp, Users, AlertCircle } from 'lucide-react';
import styles from './AdminDashboard.module.css';

// Mock Data for Charts
const dataBar = [
  { name: 'Matriz', lidos: 85, nao_lidos: 15 },
  { name: 'Unidade Centro', lidos: 65, nao_lidos: 35 },
  { name: 'Unidade Sul', lidos: 90, nao_lidos: 10 },
  { name: 'Unidade Norte', lidos: 45, nao_lidos: 55 },
];

const dataPie = [
  { name: 'Lidos', value: 78 },
  { name: 'Pendentes', value: 22 },
];

const COLORS = ['var(--color-primary-accent)', 'var(--color-border)'];

export const AdminDashboard: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Painel Gerencial</h1>
        <p className={styles.subtitle}>Acompanhamento de leitura e engajamento da comunicação</p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Taxa Geral de Leitura</span>
            <div className={styles.statIcon} style={{color: 'var(--color-primary-accent)'}}><Eye size={18}/></div>
          </div>
          <div className={styles.statValue}>78%</div>
          <div className={`${styles.statChange} ${styles.positive}`}>
            <TrendingUp size={14} /> +5% este mês
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Comunicados Publicados</span>
            <div className={styles.statIcon} style={{color: 'var(--color-purple)'}}><Users size={18}/></div>
          </div>
          <div className={styles.statValue}>124</div>
          <div className={styles.statChange}>
            12 nos últimos 30 dias
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Pendências Críticas</span>
            <div className={styles.statIcon} style={{color: 'var(--color-danger)'}}><AlertCircle size={18}/></div>
          </div>
          <div className={styles.statValue}>18</div>
          <div className={`${styles.statChange} ${styles.negative}`}>
            Usuários com comunicados vencidos
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Buscas sem resultado</span>
            <div className={styles.statIcon} style={{color: 'var(--color-warning)'}}><AlertCircle size={18}/></div>
          </div>
          <div className={styles.statValue}>45</div>
          <div className={styles.statChange}>
            Termos não encontrados no portal
          </div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Taxa de Leitura por Unidade</h3>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataBar} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{fill: 'var(--color-bg-body)'}} />
                <Bar dataKey="lidos" stackId="a" fill="var(--color-primary-accent)" radius={[0, 0, 4, 4]} />
                <Bar dataKey="nao_lidos" stackId="a" fill="var(--color-border)" radius={[4, 4, 0, 0]} />
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
            <div style={{textAlign: 'center', marginTop: '-150px', fontWeight: 700, fontSize: '2rem'}}>
              78%
            </div>
          </div>
        </div>
      </div>

      <div className={styles.listsGrid}>
        <div className={styles.listCard}>
          <h3 className={styles.listTitle}>Usuários com Maior Atraso</h3>
          <div className={styles.listItem}>
            <div className={styles.itemLeft}>
              <div className={styles.itemAvatar}>JS</div>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>João Silva</span>
                <span className={styles.itemSub}>Unidade Norte • Recepção</span>
              </div>
            </div>
            <div className={styles.itemRight}>12 pendentes</div>
          </div>
          <div className={styles.listItem}>
            <div className={styles.itemLeft}>
              <div className={styles.itemAvatar}>MA</div>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>Maria Almeida</span>
                <span className={styles.itemSub}>Matriz • Faturamento</span>
              </div>
            </div>
            <div className={styles.itemRight}>8 pendentes</div>
          </div>
          <div className={styles.listItem}>
            <div className={styles.itemLeft}>
              <div className={styles.itemAvatar}>PR</div>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>Pedro Rocha</span>
                <span className={styles.itemSub}>Unidade Centro • Coleta</span>
              </div>
            </div>
            <div className={styles.itemRight}>5 pendentes</div>
          </div>
        </div>

        <div className={styles.listCard}>
          <h3 className={styles.listTitle}>Termos Mais Buscados (Sem Resultado)</h3>
          <div className={styles.listItem}>
            <div className={styles.itemLeft}>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>"Férias coletivas 2025"</span>
              </div>
            </div>
            <div className={styles.itemRight} style={{color: 'var(--color-text-muted)'}}>18 buscas</div>
          </div>
          <div className={styles.listItem}>
            <div className={styles.itemLeft}>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>"Ramal manutenção TI"</span>
              </div>
            </div>
            <div className={styles.itemRight} style={{color: 'var(--color-text-muted)'}}>12 buscas</div>
          </div>
          <div className={styles.listItem}>
            <div className={styles.itemLeft}>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>"Nova tabela Unimed"</span>
              </div>
            </div>
            <div className={styles.itemRight} style={{color: 'var(--color-text-muted)'}}>9 buscas</div>
          </div>
        </div>
      </div>
    </div>
  );
};
