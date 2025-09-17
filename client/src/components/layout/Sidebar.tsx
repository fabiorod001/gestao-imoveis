import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { 
  Building, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  FileText,
  Upload,
  Users,
  Settings,
  Calculator,
  X,
  DollarSign,
  SprayCanIcon,
  ChevronDown,
  ChevronRight
} from "lucide-react";

const navigation = [
  { name: 'Fluxo de Caixa', href: '/', icon: DollarSign },
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Imóveis', href: '/properties', icon: Building },
  { name: 'Receitas', href: '/revenues', icon: TrendingUp },
  { 
    name: 'Despesas', 
    href: '/expenses', 
    icon: TrendingDown,
    subItems: [
      {
        name: 'Limpezas',
        subItems: [
          { name: 'Importar Limpezas', href: '/cleaning/import', icon: SprayCanIcon }
        ]
      }
    ]
  },
  { name: 'Relatórios', href: '/reports', icon: FileText },
  { name: 'Importar Dados', href: '/import', icon: Upload },
];

const settings = [
  { name: 'Usuários', href: '/users', icon: Users },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Despesas', 'Despesas-Limpezas']);

  const toggleExpand = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className={cn(
        "bg-white w-64 min-h-screen shadow-lg transition-transform duration-300 ease-in-out",
        "fixed md:static z-30",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">RentManager</h1>
                <p className="text-xs text-gray-500">Gestão Financeira</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="md:hidden p-1 rounded-md hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        
        <nav className="mt-6">
          <div className="px-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location === item.href || 
                (item.href !== '/' && location.startsWith(item.href));
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isExpanded = expandedItems.includes(item.name);
              
              return (
                <div key={item.name}>
                  {/* Main item */}
                  <div className="flex items-center">
                    <Link href={item.href || '#'} className="flex-1">
                      <div className={cn(
                        "group flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer",
                        isActive
                          ? "bg-primary-50 border-r-4 border-primary-600 text-primary-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}>
                        <item.icon className={cn(
                          "mr-3 h-5 w-5",
                          isActive ? "text-primary-500" : "text-gray-400"
                        )} />
                        {item.name}
                      </div>
                    </Link>
                    {hasSubItems && (
                      <button
                        onClick={() => toggleExpand(item.name)}
                        className="p-1 mr-2 hover:bg-gray-100 rounded"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Sub items */}
                  {hasSubItems && isExpanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.subItems.map((subItem) => {
                        const hasSubSubItems = subItem.subItems && subItem.subItems.length > 0;
                        const isSubExpanded = expandedItems.includes(`${item.name}-${subItem.name}`);
                        
                        return (
                          <div key={subItem.name}>
                            {/* Sub item */}
                            <div className="flex items-center">
                              <div className="flex-1 px-4 py-1.5 text-sm font-medium text-gray-700">
                                {subItem.name}
                              </div>
                              {hasSubSubItems && (
                                <button
                                  onClick={() => toggleExpand(`${item.name}-${subItem.name}`)}
                                  className="p-1 mr-2 hover:bg-gray-100 rounded"
                                >
                                  {isSubExpanded ? (
                                    <ChevronDown className="h-3 w-3 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3 text-gray-400" />
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Sub-sub items */}
                            {hasSubSubItems && isSubExpanded && (
                              <div className="ml-6 mt-1 space-y-1">
                                {subItem.subItems.map((subSubItem) => (
                                  <Link key={subSubItem.name} href={subSubItem.href}>
                                    <div className="group flex items-center px-4 py-1.5 text-sm rounded-lg transition-colors cursor-pointer text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                                      {subSubItem.icon && <subSubItem.icon className="mr-2 h-4 w-4 text-gray-400" />}
                                      {subSubItem.name}
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-8 px-4">
            <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Configurações
            </h3>
            <div className="mt-2 space-y-1">
              {settings.map((item) => (
                <Link key={item.name} href={item.href}>
                  <div className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-4 py-2 text-sm font-medium rounded-lg cursor-pointer">
                    <item.icon className="mr-3 h-5 w-5 text-gray-400" />
                    {item.name}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
