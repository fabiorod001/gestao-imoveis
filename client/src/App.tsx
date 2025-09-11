import { lazy, Suspense, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient, prefetchCriticalData, enableOfflineSupport } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui/skeleton-screens";

// Layout sempre carregado (crítico)
import Layout from "@/components/layout/Layout";
import Landing from "@/pages/landing";

// Lazy loading para páginas não críticas (otimização mobile)
const NotFound = lazy(() => import("@/pages/not-found"));
const CashFlow = lazy(() => import("@/pages/cash-flow"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Properties = lazy(() => import("@/pages/properties"));
const PropertyDetails = lazy(() => import("@/pages/property-details"));
const EditProperty = lazy(() => import("@/pages/edit-property"));
const Revenues = lazy(() => import("@/pages/revenues"));
const Expenses = lazy(() => import("@/pages/expenses"));
const Reports = lazy(() => import("@/pages/reports"));
const Import = lazy(() => import("@/pages/import"));
const Taxes = lazy(() => import("@/pages/taxes"));
const ManagementExpenses = lazy(() => import("@/pages/expenses/management"));
const CleaningExpenses = lazy(() => import("@/pages/expenses/cleaning"));
const CondominiumExpenses = lazy(() => import("@/pages/expenses/condominium"));
const OtherExpenses = lazy(() => import("@/pages/expenses/others"));
const CategoryDetailPage = lazy(() => import("@/pages/expenses/category-detail"));
const TaxesDetailPage = lazy(() => import("@/pages/expenses/taxes-detail"));
const CondominiumDetailPage = lazy(() => import("@/pages/expenses/condominium-detail"));
const ManagementDetailPage = lazy(() => import("@/pages/expenses/management-detail"));
const UtilitiesDetailPage = lazy(() => import("@/pages/expenses/utilities-detail"));
const MaintenanceDetailPage = lazy(() => import("@/pages/expenses/maintenance-detail"));
const CleaningDetailPage = lazy(() => import("@/pages/expenses/cleaning-detail"));
const FinancingDetailPage = lazy(() => import("@/pages/expenses/financing-detail"));
const OtherDetailPage = lazy(() => import("@/pages/expenses/other-detail"));
const Settings = lazy(() => import("@/pages/settings"));
const TaxSettings = lazy(() => import("@/pages/tax-settings"));
const MarcoZero = lazy(() => import("@/pages/marco-zero"));

// Componente de fallback para lazy loading
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="large" />
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Prefetch dados críticos após autenticação
  useEffect(() => {
    if (isAuthenticated) {
      prefetchCriticalData();
    }
  }, [isAuthenticated]);

  // Show loading state while checking authentication
  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <Route path="/" component={CashFlow} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/properties" component={Properties} />
            <Route path="/property/:id" component={PropertyDetails} />
            <Route path="/property/:id/edit" component={EditProperty} />
            <Route path="/revenues" component={Revenues} />
            <Route path="/expenses" component={Expenses} />
            <Route path="/reports" component={Reports} />
            <Route path="/import" component={Import} />
            <Route path="/taxes" component={Taxes} />
            <Route path="/expenses/management" component={ManagementExpenses} />
            <Route path="/expenses/cleaning" component={CleaningExpenses} />
            <Route path="/expenses/condominium" component={CondominiumExpenses} />
            <Route path="/expenses/others" component={OtherExpenses} />
            <Route path="/expenses/category/:category" component={CategoryDetailPage} />
            <Route path="/expenses/taxes-detail" component={TaxesDetailPage} />
            <Route path="/expenses/condominium-detail" component={CondominiumDetailPage} />
            <Route path="/expenses/management-detail" component={ManagementDetailPage} />
            <Route path="/expenses/utilities-detail" component={UtilitiesDetailPage} />
            <Route path="/expenses/maintenance-detail" component={MaintenanceDetailPage} />
            <Route path="/expenses/cleaning-detail" component={CleaningDetailPage} />
            <Route path="/expenses/financing-detail" component={FinancingDetailPage} />
            <Route path="/expenses/other-detail" component={OtherDetailPage} />
            <Route path="/settings" component={Settings} />
            <Route path="/settings/taxes" component={TaxSettings} />
            <Route path="/marco-zero" component={MarcoZero} />
          </Suspense>
        </Layout>
      )}
      <Suspense fallback={<PageLoader />}>
        <Route component={NotFound} />
      </Suspense>
    </Switch>
  );
}

function App() {
  // Habilita suporte offline ao iniciar
  useEffect(() => {
    enableOfflineSupport();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
