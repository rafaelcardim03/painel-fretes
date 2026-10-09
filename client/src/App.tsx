import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Faturamento from "./pages/Faturamento";
import Frota from "./pages/Frota";
import DREFrota from "./pages/DREFrota";
import Agregados from "./pages/Agregados";
import Importacao from "./pages/Importacao";
import Cadastros from "./pages/Cadastros";
import Terceiros from "./pages/Terceiros";
import GestaoVista from "./pages/GestaoVista";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/faturamento" component={Faturamento} />
      <Route path="/frota" component={Frota} />
      <Route path="/dre-frota" component={DREFrota} />
      <Route path="/agregados" component={Agregados} />
      <Route path="/importacao" component={Importacao} />
      <Route path="/cadastros" component={Cadastros} />
      <Route path="/terceiros" component={Terceiros} />
      <Route path="/gestao-vista" component={GestaoVista} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
