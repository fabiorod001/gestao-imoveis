import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Building2, Calculator, Check, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Property } from "@shared/schema";
import { z } from "zod";
import ConsolidatedExpenseTable from './ConsolidatedExpenseTable';

const condominiumFormSchema = z.object({
  propertyId: z.string().min(1, "Selecione uma propriedade"),
  date: z.string().min(1, "Data é obrigatória"),
  description: z.string().min(1, "Descrição é obrigatória"),
  fields: z.record(z.string(), z.string()),
});

type FormData = z.infer<typeof condominiumFormSchema>;

interface CondominiumExpenseFormProps {
  onComplete: (expense: any) => void;
  onCancel: () => void;
  getPropertyStructure: (propertyName: string) => { name: string; placeholder: string }[];
}

export default function CondominiumExpenseForm({ 
  onComplete, 
  onCancel, 
  getPropertyStructure 
}: CondominiumExpenseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentPropertyIndex, setCurrentPropertyIndex] = useState(0);
  const [completedProperties, setCompletedProperties] = useState<string[]>([]);
  const [dataUpdateTrigger, setDataUpdateTrigger] = useState(0);

  const form = useForm<FormData>({
    resolver: zodResolver(condominiumFormSchema),
    defaultValues: {
      propertyId: "",
      date: new Date().toISOString().split('T')[0],
      description: "",
      fields: {},
    },
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/dashboard'] });
      toast({
        title: "Sucesso",
        description: "Despesas de condomínio cadastradas com sucesso",
      });
      form.reset();
      setCompletedProperties([]);
      setCurrentPropertyIndex(0);
      setDataUpdateTrigger(prev => prev + 1);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao cadastrar despesas de condomínio",
        variant: "destructive",
      });
    },
  });

  const selectedProperty = properties.find(p => p.id.toString() === form.watch('propertyId'));
  const propertyStructure = selectedProperty ? getPropertyStructure(selectedProperty.name) : [];
  


  const calculateTotal = () => {
    const fields = form.watch('fields') || {};
    return Object.values(fields).reduce((sum, value) => {
      const numValue = parseFloat(value) || 0;
      return sum + numValue;
    }, 0);
  };

  const onSubmit = async (data: FormData) => {
    const totalAmount = calculateTotal();
    
    if (totalAmount === 0) {
      toast({
        title: "Erro",
        description: "Pelo menos um campo deve ter valor",
        variant: "destructive",
      });
      return;
    }

    // Preparar dados para criação das transações
    const transactionData = {
      propertyId: parseInt(data.propertyId),
      type: 'expense',
      category: 'condominium',
      description: `${data.description} - ${selectedProperty?.name}`,
      amount: totalAmount.toString(), // Convert to string
      date: data.date,
      currency: 'BRL',
      // Salvar detalhamento dos campos no metadata
      metadata: {
        condominiumFields: data.fields,
        propertyStructure: propertyStructure.map(f => f.placeholder),
      }
    };

    try {
      await createMutation.mutateAsync(transactionData);
      
      // Adicionar à lista de propriedades concluídas
      const completedData = {
        type: 'Condomínio',
        propertyName: selectedProperty?.name,
        totalAmount,
        date: data.date,
        fields: data.fields
      };

      setCompletedProperties(prev => [...prev, selectedProperty?.name || '']);
      
      // Resetar formulário para próxima propriedade
      form.reset({
        propertyId: "",
        date: data.date, // Manter a mesma data
        description: data.description, // Manter a mesma descrição base
        fields: {},
      });

      // Se ainda há propriedades, perguntar se quer continuar
      if (properties.length > completedProperties.length + 1) {
        toast({
          title: "Despesa cadastrada!",
          description: "Escolha outra propriedade ou finalize",
        });
      } else {
        // Concluir processo
        onComplete(completedData);
      }
    } catch (error) {
      // Erro já tratado no onError da mutation
    }
  };

  const handleFinish = () => {
    onComplete({
      type: 'Condomínio',
      count: completedProperties.length,
      properties: completedProperties
    });
  };

  return (
    <>
      <div className="space-y-6">
        {/* Progress */}
        {completedProperties.length > 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-green-800">
                    Propriedades Cadastradas ({completedProperties.length})
                  </h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {completedProperties.map((propName, index) => (
                      <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                        <Check className="h-3 w-3 mr-1" />
                        {propName}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button onClick={handleFinish} variant="outline">
                  Finalizar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Despesas de Condomínio
          </CardTitle>
          <p className="text-muted-foreground">
            Cadastre as despesas de condomínio para cada propriedade. Os campos variam conforme a estrutura específica de cada condomínio.
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Property and Date Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Propriedade</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a propriedade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties
                            .filter(property => !completedProperties.includes(property.name))
                            .map(property => (
                            <SelectItem key={property.id} value={property.id.toString()}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Competência</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Condomínio Junho/2025"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dynamic Fields based on Property */}
              {selectedProperty && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">Composição do Condomínio - {selectedProperty.name}</h4>
                    <Badge variant="secondary">
                      {propertyStructure.length} campos
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {propertyStructure.map((field) => (
                      <FormField
                        key={field.name}
                        control={form.control}
                        name={`fields.${field.name}`}
                        render={({ field: formField }) => (
                          <FormItem>
                            <FormLabel>{field.placeholder}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                {...formField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>

                  {/* Total */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Total do Condomínio:</span>
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        <span className="text-lg font-bold">
                          R$ {calculateTotal().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={!selectedProperty || calculateTotal() === 0 || createMutation.isPending}
                >
                  {createMutation.isPending ? "Salvando..." : "Salvar e Continuar"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
    
    {/* Consolidated table view */}
    <ConsolidatedExpenseTable 
      category="condominium" 
      onDataUpdate={() => dataUpdateTrigger} 
    />
    </>
  );
}