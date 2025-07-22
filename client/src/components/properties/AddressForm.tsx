import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { formatAddress, hasAddressData } from "@/lib/addressUtils";

interface AddressFormProps {
  form: UseFormReturn<any>;
}

export default function AddressForm({ form }: AddressFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const watchedAddress = form.watch([
    'condominiumName', 'street', 'number', 'tower', 'unit', 
    'neighborhood', 'city', 'state', 'country', 'zipCode', 'address'
  ]);
  
  const addressData = {
    condominiumName: watchedAddress[0],
    street: watchedAddress[1],
    number: watchedAddress[2],
    tower: watchedAddress[3],
    unit: watchedAddress[4],
    neighborhood: watchedAddress[5],
    city: watchedAddress[6],
    state: watchedAddress[7],
    country: watchedAddress[8],
    zipCode: watchedAddress[9],
  };
  
  const legacyAddress = watchedAddress[10]; // Campo address legado
  const formattedAddress = formatAddress(addressData);
  const hasStructuredAddress = hasAddressData(addressData);
  const hasLegacyAddress = legacyAddress && legacyAddress.trim() !== '';
  const hasAnyAddress = hasStructuredAddress || hasLegacyAddress;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Endereço Completo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview do endereço formatado */}
        {hasAnyAddress && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
            <p className="text-sm font-medium mb-1">Endereço atual:</p>
            <p className="text-sm whitespace-pre-line text-gray-600 dark:text-gray-300">
              {hasStructuredAddress ? formattedAddress : legacyAddress}
            </p>
            {hasLegacyAddress && !hasStructuredAddress && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Endereço em formato antigo - expanda os campos abaixo para organizá-lo em detalhes
              </p>
            )}
          </div>
        )}
        
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              {hasAnyAddress ? "Editar Endereço" : "Adicionar Endereço"}
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Linha 1: Condomínio, Logradouro, Número */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="condominiumName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Condomínio</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Condomínio Andalus" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logradouro</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Avenida Padre Lebret" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: 801" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Linha 2: Torre, Unidade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tower"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Torre</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Málaga" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: M07" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Linha 3: Bairro, Cidade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="neighborhood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Vila Olímpia" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: São Paulo" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Linha 4: Estado, País, CEP */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: SP" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>País</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Brasil" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: 05653-160" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}