"use client";

import { useState, useEffect } from "react";
import { CreditCard, Zap, ShieldAlert, CheckCircle2 } from "lucide-react";
// Assuming generic UI components from shadcn/ui exist
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export default function BillingSettings() {
  const [plans, setPlans] = useState<any[]>([]);
  const [currentCommerce, setCurrentCommerce] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      // Endpoint to fetch commerce billing details and available plans
      const res = await fetch('/api/billing/portal-data');
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans);
        setCurrentCommerce(data.commerce);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (planId: string, interval: 'month' | 'year') => {
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, interval })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // Redirect to Stripe Checkout
      }
    } catch (e) {
      toast({ title: 'Error iniciando el pago', variant: 'destructive' });
    }
  };

  const toggleOverageBehavior = async (checked: boolean) => {
    const newBehavior = checked ? 'METERED_BILLING' : 'HARD_LIMIT';
    // Optimistic update
    setCurrentCommerce({ ...currentCommerce, overageBehavior: newBehavior });
    
    try {
      const res = await fetch('/api/billing/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overageBehavior: newBehavior })
      });
      
      if (!res.ok) throw new Error('Failed to update');
      
      toast({ 
        title: 'Preferencias actualizadas',
        description: checked 
          ? 'Si superas tus límites de IA, se te facturará el extra a final de mes.'
          : 'El bot se apagará automáticamente al alcanzar tu límite para evitar cobros sorpresa.'
      });
    } catch (e) {
      toast({ title: 'Error guardando preferencias', variant: 'destructive' });
      // Revert on error
      setCurrentCommerce({ ...currentCommerce, overageBehavior: currentCommerce.overageBehavior });
    }
  };

  if (loading) return <div>Cargando planes...</div>;

  return (
    <div className="container mx-auto py-8 max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Facturación y Planes</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona tu suscripción y controla los límites de gasto de Inteligencia Artificial.
        </p>
      </div>

      {/* Control de Overage */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-blue-500" />
            Control de Gasto (IA)
          </CardTitle>
          <CardDescription>
            Decide qué ocurre cuando tu bot supera el límite de conversaciones mensuales o tokens de OpenAI.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="overage-toggle" className="text-base font-semibold">
              Permitir sobrecostes (Pago por uso)
            </Label>
            <p className="text-sm text-muted-foreground max-w-xl">
              Si está activado, el bot nunca dejará de responder a tus clientes. Te cobraremos el excedente a final de mes. 
              Si está desactivado, el bot se apagará automáticamente al llegar al límite (0 sorpresas en tu tarjeta).
            </p>
          </div>
          <Switch 
            id="overage-toggle" 
            checked={currentCommerce?.overageBehavior === 'METERED_BILLING'}
            onCheckedChange={toggleOverageBehavior}
          />
        </CardContent>
      </Card>

      {/* Grid de Planes */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map(plan => {
          const isCurrentPlan = currentCommerce?.subscriptions?.[0]?.planId === plan.id;
          
          return (
            <Card key={plan.id} className={isCurrentPlan ? 'border-primary ring-1 ring-primary' : ''}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold mb-6">
                  {plan.monthlyPrice}€<span className="text-sm text-muted-foreground font-normal">/mes</span>
                </div>
                
                <ul className="space-y-3">
                  {plan.features?.map((f: any) => (
                    <li key={f.id} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="capitalize">{f.featureKey.replace('_', ' ')}:</span>
                      <span className="font-semibold">{f.value === 'UNLIMITED' ? 'Ilimitado' : f.value}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {isCurrentPlan ? (
                  <Button variant="outline" className="w-full" disabled>Plan Actual</Button>
                ) : (
                  <Button className="w-full" onClick={() => handleCheckout(plan.id, 'month')}>
                    Seleccionar {plan.name}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

    </div>
  );
}
