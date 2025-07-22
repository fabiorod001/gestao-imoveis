import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Properties from "@/pages/properties";
import PropertyDetails from "@/pages/property-details";
import EditProperty from "@/pages/edit-property";
import Revenues from "@/pages/revenues";
import Expenses from "@/pages/expenses";
import Reports from "@/pages/reports";
import Conversion from "@/pages/conversion";
import Import from "@/pages/import";
import Taxes from "@/pages/taxes";
import ManagementExpenses from "@/pages/expenses/management";
import CleaningExpenses from "@/pages/expenses/cleaning";
import CondominiumExpenses from "@/pages/expenses/condominium";
import OtherExpenses from "@/pages/expenses/others";
import CategoryDetailPage from "@/pages/expenses/category-detail";
import TaxesDetailPage from "@/pages/expenses/taxes-detail";
import CondominiumDetailPage from "@/pages/expenses/condominium-detail";
import ManagementDetailPage from "@/pages/expenses/management-detail";
import UtilitiesDetailPage from "@/pages/expenses/utilities-detail";
import MaintenanceDetailPage from "@/pages/expenses/maintenance-detail";
import CleaningDetailPage from "@/pages/expenses/cleaning-detail";
import FinancingDetailPage from "@/pages/expenses/financing-detail";
import OtherDetailPage from "@/pages/expenses/other-detail";

import Layout from "@/components/layout/Layout";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <Layout>
          <Route path="/" component={Dashboard} />
          <Route path="/properties" component={Properties} />
          <Route path="/property/:id" component={PropertyDetails} />
          <Route path="/property/:id/edit" component={EditProperty} />
          <Route path="/revenues" component={Revenues} />
          <Route path="/expenses" component={Expenses} />
          <Route path="/reports" component={Reports} />
          <Route path="/conversion" component={Conversion} />
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
        </Layout>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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
