import React, { useEffect, useState } from 'react';
import { BellRing, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useComunicados } from '../../context/ComunicadosContext';
import { useAuth } from '../../context/AuthContext';

// Subtle Web Audio API synthesis (zero external audio files needed)
const playChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // AudioContext blocked or not supported
  }
};

export const LiveNotificationToast: React.FC = () => {
  const { comunicados } = useComunicados();
  const { session, activeCompany } = useAuth();
  const [latestToast, setLatestToast] = useState<{ id: string; title: string; type: string; isTicket?: boolean } | null>(null);
  const [lastSeenId, setLastSeenId] = useState<string | null>(null);
  const navigate = useNavigate();

  // 1. Ouvir via SSE (/api/realtime/stream) se suportado
  useEffect(() => {
    if (!session || !activeCompany?.id) return;

    let eventSource: EventSource | null = null;
    try {
      const url = `/api/realtime/stream?companyId=${activeCompany.id}`;
      eventSource = new EventSource(url, { withCredentials: true });

      eventSource.addEventListener('new_notice', (event) => {
        try {
          const data = JSON.parse(event.data);
          setLatestToast({ id: data.id, title: data.title, type: data.type || 'Informativo' });
          playChime();
        } catch {}
      });

      eventSource.addEventListener('new_ticket', (event) => {
        try {
          const data = JSON.parse(event.data);
          setLatestToast({ id: data.id, title: `Novo chamado: ${data.subject}`, type: 'Chamado', isTicket: true });
          playChime();
        } catch {}
      });
    } catch {}

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [session, activeCompany?.id]);

  // 2. Fallback baseado no contexto de comunicados
  useEffect(() => {
    if (comunicados.length === 0) return;
    const newest = comunicados[0];

    if (!lastSeenId) {
      setLastSeenId(newest.id);
      return;
    }

    if (newest.id !== lastSeenId && !newest.read) {
      setLastSeenId(newest.id);
      setLatestToast({ id: newest.id, title: newest.title, type: newest.type });
      playChime();

      const timer = setTimeout(() => {
        setLatestToast(null);
      }, 7000);

      return () => clearTimeout(timer);
    }
  }, [comunicados, lastSeenId]);

  if (!latestToast) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        background: 'rgba(24, 24, 27, 0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(249, 115, 22, 0.4)',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 25px rgba(249, 115, 22, 0.25)',
        borderRadius: '16px',
        padding: '16px 20px',
        maxWidth: '380px',
        width: 'calc(100vw - 48px)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        color: '#fff',
        animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div
        style={{
          background: latestToast.type === 'Urgente' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(249, 115, 22, 0.2)',
          color: latestToast.type === 'Urgente' ? '#f87171' : '#fb923c',
          padding: '10px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <BellRing size={20} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: latestToast.type === 'Urgente' ? '#f87171' : '#fb923c'
            }}
          >
            {latestToast.type === 'Urgente' ? 'Aviso Urgente' : 'Novo Comunicado'}
          </span>
          <button
            onClick={() => setLatestToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.4)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex'
            }}
          >
            <X size={16} />
          </button>
        </div>

        <p
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#f4f4f5',
            margin: '0 0 10px 0',
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {latestToast.title}
        </p>

        <button
          onClick={() => {
            if (latestToast.isTicket) {
              navigate('/admin/suporte');
            } else {
              navigate(`/comunicados/${latestToast.id}`);
            }
            setLatestToast(null);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 600,
            padding: '6px 12px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          {latestToast.isTicket ? 'Ver chamado' : 'Ler agora'} <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};
