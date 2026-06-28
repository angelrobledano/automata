"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Archive, Copy, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    const res = await fetch('/api/admin/plans');
    if (res.ok) {
      const data = await res.json();
      setPlans(data);
    }
  };

  const handleSavePlan = async () => {
    try {
      const res = await fetch(`/api/admin/plans/${editingPlan.id || 'new'}`, {
        method: editingPlan.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPlan)
      });
      if (!res.ok) throw new Error();
      
      toast({ title: 'Plan guardado exitosamente' });
      setEditingPlan(null);
      fetchPlans();
    } catch (e) {
      toast({ title: 'Error guardando el plan', variant: 'destructive' });
    }
  };

  const addFeature = () => {
    setEditingPlan({
      ...editingPlan,
      features: [...(editingPlan.features || []), { featureKey: '', value: '' }]
    });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Motor de Planes (Billing Engine)</h1>
          <p className="text-muted-foreground">Configura los planes, precios y límites dinámicos sin tocar código.</p>
        </div>
        <Button onClick={() => setEditingPlan({ name: '', monthlyPrice: 0, features: [] })}>
          <Plus className="h-4 w-4 mr-2" />
          Crear Nuevo Plan
        </Button>
      </div>

      {!editingPlan ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Precio (Mes)</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Stripe Price ID</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map(plan => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>{plan.monthlyPrice}€</TableCell>
                  <TableCell>{plan.status}</TableCell>
                  <TableCell className="font-mono text-xs">{plan.providerPriceId || 'N/A'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingPlan(plan)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Archive className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {plans.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No hay planes configurados. Crea el primero.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>{editingPlan.id ? 'Editar Plan' : 'Nuevo Plan'}</CardTitle>
            <CardDescription>Crea un plan y configúrale las capacidades (Feature Flags / Límites).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre del Plan</Label>
                <Input 
                  value={editingPlan.name} 
                  onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} 
                  placeholder="Ej. Pro Mensual" 
                />
              </div>
              <div className="space-y-2">
                <Label>Precio Mensual (€)</Label>
                <Input 
                  type="number"
                  value={editingPlan.monthlyPrice} 
                  onChange={e => setEditingPlan({...editingPlan, monthlyPrice: parseFloat(e.target.value)})} 
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Stripe Price ID</Label>
                <Input 
                  value={editingPlan.providerPriceId} 
                  onChange={e => setEditingPlan({...editingPlan, providerPriceId: e.target.value})} 
                  placeholder="price_1Nsxxx..." 
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-lg">Características y Límites</Label>
                <Button variant="outline" size="sm" onClick={addFeature}>
                  <Plus className="h-3 w-3 mr-1" /> Añadir Límite
                </Button>
              </div>
              
              <div className="space-y-3">
                {editingPlan.features?.map((feat: any, idx: number) => (
                  <div key={idx} className="flex gap-3 items-center">
                    <Input 
                      placeholder="Feature Key (ej. max_conversations)" 
                      value={feat.featureKey}
                      onChange={e => {
                        const newF = [...editingPlan.features];
                        newF[idx].featureKey = e.target.value;
                        setEditingPlan({...editingPlan, features: newF});
                      }}
                    />
                    <Input 
                      placeholder="Valor (ej. 1000, UNLIMITED, true)" 
                      value={feat.value}
                      onChange={e => {
                        const newF = [...editingPlan.features];
                        newF[idx].value = e.target.value;
                        setEditingPlan({...editingPlan, features: newF});
                      }}
                    />
                  </div>
                ))}
                {(!editingPlan.features || editingPlan.features.length === 0) && (
                  <p className="text-sm text-muted-foreground">No hay límites configurados. Pulsa Añadir Límite.</p>
                )}
              </div>
            </div>
          </CardContent>
          <CardContent className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditingPlan(null)}>Cancelar</Button>
            <Button onClick={handleSavePlan}>
              <Save className="h-4 w-4 mr-2" />
              Guardar Plan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
