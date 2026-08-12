import React from 'react';
import { ExternalLink, Monitor, Stethoscope, Briefcase, FileSignature, HeartPulse, GraduationCap } from 'lucide-react';
import styles from './QuickLinks.module.css';

const linkGroups = [
  {
    category: 'Sistemas Operacionais',
    icon: <Monitor size={20} color="var(--color-primary-accent)" />,
    links: [
      { id: 1, title: 'SHIFT - Sistema LIS', desc: 'Sistema principal de gestão laboratorial', url: '#', icon: <Stethoscope size={24} /> },
      { id: 2, title: 'iBlood', desc: 'Sistema de gestão de banco de sangue', url: '#', icon: <HeartPulse size={24} /> },
    ]
  },
  {
    category: 'Recursos Humanos & Adm',
    icon: <Briefcase size={20} color="var(--color-primary-accent)" />,
    links: [
      { id: 3, title: 'Portal do Colaborador', desc: 'Holerites, ponto e benefícios', url: '#', icon: <Briefcase size={24} /> },
      { id: 4, title: 'Plataforma EAD', desc: 'Treinamentos e capacitações online', url: '#', icon: <GraduationCap size={24} /> },
      { id: 5, title: 'DocuSign', desc: 'Assinatura digital de documentos', url: '#', icon: <FileSignature size={24} /> },
    ]
  }
];

export const QuickLinks: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Links Rápidos</h1>
        <p className={styles.subtitle}>Acesso direto aos principais sistemas e plataformas utilizados na empresa.</p>
      </div>

      {linkGroups.map((group, index) => (
        <div key={index} className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {group.icon}
            {group.category}
          </h2>
          
          <div className={styles.linksGrid}>
            {group.links.map(link => (
              <a href={link.url} key={link.id} target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.iconWrapper}>
                  {link.icon}
                </div>
                <div className={styles.linkContent}>
                  <div className={styles.linkTitle}>{link.title}</div>
                  <div className={styles.linkDesc}>{link.desc}</div>
                </div>
                <ExternalLink size={18} className={styles.externalIcon} />
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
