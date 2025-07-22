import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import PropertyCard from "@/components/properties/PropertyCard";
import type { Property } from "@shared/schema";

export default function PropertiesList() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  const filteredProperties = properties
    .filter(property =>
      property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .slice(0, 6); // Show only first 6 for dashboard

  return (
    <Card className="border-0 shadow-lg bg-white dark:bg-slate-800">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Portfolio de Imóveis
          </CardTitle>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar imóveis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64 bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600"
              />
            </div>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0">
              <Plus className="w-4 h-4 mr-2" />
              Novo Imóvel
            </Button>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {properties.length} propriedades no total • {properties.filter(p => p.status === 'active').length} ativas
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {searchTerm ? 'Nenhum imóvel encontrado' : 'Nenhum imóvel cadastrado'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {searchTerm ? 'Tente ajustar os termos de busca.' : 'Comece adicionando seu primeiro imóvel.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
            
            {properties.length > 6 && (
              <div className="mt-8 text-center">
                <Link href="/properties">
                  <Button variant="outline" className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    Ver todos os imóveis ({properties.length} total)
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
