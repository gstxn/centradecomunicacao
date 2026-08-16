import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React tree:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.href = '/login';
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          backgroundColor: '#0A0A0C',
          color: '#F2EFE9',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '520px',
            backgroundColor: '#151518',
            border: '1px solid #29292E',
            borderRadius: '12px',
            padding: '2.5rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#E07A5F' }}>Algo inesperado aconteceu</h2>
            <p style={{ color: '#A0A0A8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              Ocorreu um erro ao carregar esta visualização. Se você tinha uma sessão salva anterior, limpar os dados locais resolverá o problema.
            </p>
            {this.state.error?.message && (
              <pre style={{
                background: '#0e0e11',
                padding: '0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                color: '#EF4444',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: '1.5rem'
              }}>
                {this.state.error.message}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: '0.75rem 1.25rem',
                  backgroundColor: '#29292E',
                  color: '#F2EFE9',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Recarregar página
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  padding: '0.75rem 1.25rem',
                  backgroundColor: '#E07A5F',
                  color: '#0A0A0C',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 700
                }}
              >
                Limpar cache e entrar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
