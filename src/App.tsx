import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ComunicadosProvider } from './context/ComunicadosContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const Login = lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })));
const ComunicadosList = lazy(() => import('./pages/Comunicados').then((module) => ({ default: module.ComunicadosList })));
const ComunicadoDetail = lazy(() => import('./pages/ComunicadoDetail').then((module) => ({ default: module.ComunicadoDetail })));
const KnowledgePortal = lazy(() => import('./pages/KnowledgePortal').then((module) => ({ default: module.KnowledgePortal })));
const DocumentLibrary = lazy(() => import('./pages/DocumentLibrary').then((module) => ({ default: module.DocumentLibrary })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));
const NewPublication = lazy(() => import('./pages/NewPublication').then((module) => ({ default: module.NewPublication })));
const CalendarPage = lazy(() => import('./pages/Calendar').then((module) => ({ default: module.CalendarPage })));
const QuickLinks = lazy(() => import('./pages/QuickLinks').then((module) => ({ default: module.QuickLinks })));
const Pendencias = lazy(() => import('./pages/Pendencias').then((module) => ({ default: module.Pendencias })));
const ReadingHistory = lazy(() => import('./pages/ReadingHistory').then((module) => ({ default: module.ReadingHistory })));
const Reports = lazy(() => import('./pages/Reports').then((module) => ({ default: module.Reports })));
const CategoryPage = lazy(() => import('./pages/CategoryPage').then((module) => ({ default: module.CategoryPage })));
const Support = lazy(() => import('./pages/Support').then((module) => ({ default: module.Support })));
const AdminSupport = lazy(() => import('./pages/AdminSupport').then((module) => ({ default: module.AdminSupport })));
const TenantAdmin = lazy(() => import('./pages/TenantAdmin').then((module) => ({ default: module.TenantAdmin })));

const PageLoader = () => <div role="status" style={{ padding: '3rem', textAlign: 'center' }}>Carregando conteúdo...</div>;

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ComunicadosProvider>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  
                  <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<AppLayout />}>
                      <Route index element={<Dashboard />} />
                      <Route path="comunicados" element={<ComunicadosList />} />
                      <Route path="comunicados/:id" element={<ComunicadoDetail />} />
                      <Route path="conhecimento" element={<KnowledgePortal />} />
                      <Route path="documentos" element={<DocumentLibrary />} />
                      <Route path="calendario" element={<CalendarPage />} />
                      <Route path="links" element={<QuickLinks />} />
                      <Route path="pendencias" element={<Pendencias />} />
                      <Route path="leituras" element={<ReadingHistory />} />
                      <Route path="relatorios" element={<Reports />} />
                      <Route path="suporte" element={<Support />} />
                      <Route path="cat/:id" element={<CategoryPage />} />
                      <Route element={<ProtectedRoute requiredPermission="reports.view" />}>
                        <Route path="admin/indicadores" element={<AdminDashboard />} />
                      </Route>
                      <Route element={<ProtectedRoute requiredPermission="users.view" />}>
                        <Route path="admin/empresa" element={<TenantAdmin />} />
                      </Route>
                      <Route element={<ProtectedRoute requiredPermission="support.manage" />}>
                        <Route path="admin/chamados" element={<AdminSupport />} />
                      </Route>
                      <Route element={<ProtectedRoute requiredPermission="notices.create" />}>
                        <Route path="admin/novo-comunicado" element={<NewPublication />} />
                      </Route>
                      
                      <Route path="*" element={
                        <div style={{padding: '2rem', textAlign: 'center'}}>
                          <h2 style={{fontSize: '2rem', marginBottom: '1rem'}}>Página em construção...</h2>
                          <p>Esta funcionalidade será implementada em breve.</p>
                        </div>
                      } />
                    </Route>
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ComunicadosProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
