import { useLocation } from "wouter";
import { X, Home, Building2, TrendingUp, TrendingDown, FileText, Settings, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { icon: Home, label: "Fluxo de Caixa", path: "/" },
  { icon: Building2, label: "Imóveis", path: "/properties" },
  { icon: TrendingUp, label: "Receitas", path: "/revenues" },
  { icon: TrendingDown, label: "Despesas", path: "/expenses" },
  { icon: FileText, label: "Relatórios", path: "/reports" },
  { icon: Upload, label: "Importar", path: "/import" },
  { icon: Settings, label: "Configurações", path: "/settings" },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const handleNavigation = (path: string) => {
    setLocation(path);
    if (isMobile) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile: Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white border-r border-gray-200 transition-transform duration-300",
          // Desktop: sempre visível, width fixo
          "md:relative md:translate-x-0 md:w-64",
          // Mobile: drawer animado
          "fixed inset-y-0 left-0 z-50 w-72",
          isMobile && (isOpen ? "translate-x-0" : "-translate-x-full")
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header mobile com botão fechar */}
          {isMobile && (
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Menu</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path || 
                                (item.path !== "/" && location.startsWith(item.path));

                return (
                  <li key={item.path}>
                    <button
                      onClick={() => handleNavigation(item.path)}
                      className={cn(
                        "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg",
                        "text-sm font-medium transition-colors",
                        "touch-manipulation active:scale-95",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
}
