import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, Trash2, MapPin, Euro, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Property } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";

interface PropertyCardProps {
  property: Property;
}

const statusConfig = {
  active: { label: 'Ativo', className: 'bg-green-100 text-green-800' },
  decoration: { label: 'Decoração', className: 'bg-yellow-100 text-yellow-800' },
  financing: { label: 'Financiamento', className: 'bg-blue-100 text-blue-800' },
  inactive: { label: 'Inativo', className: 'bg-gray-100 text-gray-800' },
};

export default function PropertyCard({ property }: PropertyCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/properties/${property.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      toast({
        title: "Sucesso",
        description: "Imóvel removido com sucesso",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao remover imóvel",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (confirm(`Tem certeza que deseja remover o imóvel "${property.name}"?`)) {
      deleteMutation.mutate();
    }
  };

  const statusInfo = statusConfig[property.status as keyof typeof statusConfig] || statusConfig.inactive;

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white dark:bg-slate-800 overflow-hidden">
      <CardContent className="p-0">
        {/* Header with gradient */}
        <div className="h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 relative">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute top-4 right-4">
            <Badge className={`${statusInfo.className} border-0 shadow-sm`}>
              {statusInfo.label}
            </Badge>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 -mt-4 relative">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700 mb-4">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-lg mb-2 line-clamp-2">
              {property.name}
            </h4>
            <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 mb-3">
              <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
              <span className="line-clamp-1">{property.address}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center">
                <span className="text-slate-500 dark:text-slate-400">Tipo:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100 ml-2 capitalize">
                  {property.type}
                </span>
              </div>
              
              {property.rentalType && (
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 text-slate-400 mr-1" />
                  <span className="font-medium text-slate-900 dark:text-slate-100 capitalize">
                    {property.rentalType}
                  </span>
                </div>
              )}
              
              {property.purchasePrice && (
                <div className="flex items-center col-span-2">
                  <Euro className="w-3 h-3 text-slate-400 mr-1" />
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    €{Number(property.purchasePrice).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex space-x-2">
            <Link href={`/property/${property.id}`} className="flex-1">
              <Button variant="default" size="sm" className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0">
                <Eye className="w-4 h-4 mr-2" />
                Ver Detalhes
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="hover:bg-slate-50 dark:hover:bg-slate-700">
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
