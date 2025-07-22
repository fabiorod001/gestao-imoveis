import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Menu, DollarSign } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const [currency, setCurrency] = useState("BRL");

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard Financeiro</h2>
            <p className="text-sm text-gray-500">
              Atualizado em {new Date().toLocaleDateString('pt-BR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Currency Selector */}
          <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
            <DollarSign className="h-4 w-4 text-gray-400" />
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="border-none bg-transparent focus:ring-0 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">BRL</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user?.firstName || user?.email || 'Usuário'}
              </p>
              <button 
                onClick={handleLogout}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Sair
              </button>
            </div>
            {user?.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
                alt="Avatar" 
                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
                {(user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
