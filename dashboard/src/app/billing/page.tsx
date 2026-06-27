"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        const res = await fetch('/api/billing');
        if (res.ok) {
          const data = await res.json();
          setPlan(data.plan);
        } else {
          setPlan('FREE'); // default if not found
        }
      } catch (e) {
        setPlan('FREE');
      } finally {
        setLoading(false);
      }
    };
    fetchBilling();
  }, []);

  const handleUpgrade = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.url;
      } else {
        throw new Error('Payment error');
      }
    } catch (e) {
      setError('Error al procesar el pago');
      setIsProcessing(false);
    }
  };

  const handleManage = () => {
    // Redirige al customer portal
    window.location.href = process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_URL || 'https://billing.stripe.com/p/login/test'; 
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando plan...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">Facturación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-lg">Tu plan actual es: <strong>{plan}</strong></p>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </CardContent>
          <CardFooter className="flex justify-center">
            {plan === 'PRO' ? (
              <Button onClick={handleManage} variant="outline" className="w-full">
                Gestionar Suscripción
              </Button>
            ) : (
              <Button onClick={handleUpgrade} disabled={isProcessing} className="w-full">
                {isProcessing ? 'Procesando...' : 'Actualizar a Pro'}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
