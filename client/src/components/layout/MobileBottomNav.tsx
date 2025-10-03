import { useLocation } from "wouter";
import { Home, Building2, TrendingUp, TrendingDown, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Início", path: "/" },
  { icon: Building2, label: "Imóveis", path: "/properties" },
  { icon: TrendingUp, label: "Receitas", path: "/revenues" },
  { icon: TrendingDown, label: "Despesas", path: "/expenses" },
  { icon: FileText, label: "Relatórios", path: "/reports" },
];

export default function MobileBottomNav() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || 
                          (item.path !== "/" && location.startsWith(item.path));
          
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full",
                "touch-manipulation active:bg-gray-50 transition-colors",
                "text-xs font-medium",
                isActive 
                  ? "text-primary" 
                  : "text-gray-600"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 mb-1",
                isActive && "stroke-[2.5]"
              )} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
