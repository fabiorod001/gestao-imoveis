import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Building, ChevronRight, GripVertical, MapPin, Home, Users, DollarSign } from "lucide-react";
import PropertyCard from "@/components/properties/PropertyCard";
import PropertyForm from "@/components/properties/PropertyForm";
import type { Property } from "@shared/schema";

export default function Properties() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  const { data: fetchedProperties = [], isLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
    queryFn: async () => {
      const res = await fetch('/api/properties', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    }
  });
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [initialized, setInitialized] = useState(false);
  
  // Initialize local state when data is fetched
  if (fetchedProperties.length > 0 && !initialized) {
    setProperties(fetchedProperties);
    setInitialized(true);
  }

  const filteredProperties = properties.filter(property =>
    property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (property.address?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Imóveis</h1>
          <p className="text-gray-500">Gerencie todos os seus imóveis</p>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Imóvel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Imóvel</DialogTitle>
            </DialogHeader>
            <PropertyForm onSuccess={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Imóveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou endereço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {filteredProperties.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-500">
              {searchTerm ? 'Nenhum imóvel encontrado com os critérios de busca.' : 'Nenhum imóvel cadastrado ainda.'}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Lista de Imóveis</CardTitle>
            <CardDescription>
              Arraste para reorganizar a ordem dos imóveis
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {filteredProperties.map((property, index) => {
                const getPropertyIcon = (type: string) => {
                  switch(type) {
                    case 'apartment': return Building;
                    case 'house': return Home;
                    case 'commercial': return Users;
                    default: return Building;
                  }
                };
                
                const getStatusColor = (status: string) => {
                  switch(status) {
                    case 'active': return 'bg-green-100 text-green-800';
                    case 'decoration': return 'bg-yellow-100 text-yellow-800';
                    case 'financing': return 'bg-blue-100 text-blue-800';
                    case 'inactive': return 'bg-gray-100 text-gray-800';
                    default: return 'bg-gray-100 text-gray-800';
                  }
                };
                
                const getStatusLabel = (status: string) => {
                  switch(status) {
                    case 'active': return 'Ativo';
                    case 'decoration': return 'Decoração';
                    case 'financing': return 'Financiamento';
                    case 'inactive': return 'Inativo';
                    default: return status;
                  }
                };
                
                const Icon = getPropertyIcon(property.type);
                
                return (
                  <div
                    key={property.id}
                    draggable
                    onDragStart={() => setDraggedItem(property.id)}
                    onDragEnd={() => setDraggedItem(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedItem && draggedItem !== property.id) {
                        const draggedIndex = properties.findIndex(p => p.id === draggedItem);
                        const targetIndex = index;
                        const newProperties = [...properties];
                        const [removed] = newProperties.splice(draggedIndex, 1);
                        newProperties.splice(targetIndex, 0, removed);
                        setProperties(newProperties);
                      }
                    }}
                    className={`${draggedItem === property.id ? 'opacity-50' : ''}`}
                  >
                    <Link href={`/property/${property.id}`}>
                      <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                          <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                          <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-medium text-gray-900">{property.name}</h3>
                              <Badge className={getStatusColor(property.status)}>
                                {getStatusLabel(property.status)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                              {property.address && (
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                  <MapPin className="h-3 w-3" />
                                  {property.address}
                                </div>
                              )}
                              {property.rentalType && (
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                  <DollarSign className="h-3 w-3" />
                                  {property.rentalType === 'monthly' ? 'Aluguel Mensal' : property.rentalType === 'airbnb' ? 'Airbnb' : 'Comercial'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
