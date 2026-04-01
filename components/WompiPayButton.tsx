'use client';

import { useState } from 'react';
import Script from 'next/script';
import { Button } from '@/components/ui/button';

export function WompiPayButton({ planId, amountInCents, tenantId }: { planId?: string, amountInCents: number, tenantId: string }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handlePayment = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      // 1. Obtener la firma de integridad del backend
      const response = await fetch('/api/wompi/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountInCents, planId, tenantId }),
      });
      
      const config = await response.json();

      if (config.error || !response.ok) {
        throw new Error(config.error || 'Failed to initialize payment');
      }

      // 2. Configurar Widget de Wompi
      // @ts-ignore - Wompi Widget is loaded via next/script
      const checkout = new window.WidgetCheckout({
        currency: config.currency,
        amountInCents: config.amountInCents,
        reference: config.reference,
        publicKey: config.publicKey,
        signature: { integrity: config.signature },
        // Redirigimos al dashboard indicando éxito (O fallido). El webhook actualizará la base de datos de manera asíncrona.
        redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}/app/dashboard?payment=complete`,
      });

      // 3. Abrir Widget
      checkout.open((result: any) => {
        const trans = result.transaction;
        if (trans.status === 'APPROVED') {
          console.log('Pago pre-aprobado en cliente', trans);
          // Opcional: mostrar un toast de éxito temporal
        } else if (trans.status === 'ERROR' || trans.status === 'DECLINED') {
           setErrorMsg('El pago fue rechazado. Por favor intenta con otro método.');
        }
      });
    } catch (error: any) {
      console.error('Error al iniciar Wompi', error);
      setErrorMsg(error.message || 'Hubo un error al conectar con la pasarela de pagos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Script src="https://checkout.wompi.co/widget.js" strategy="lazyOnload" />
      <Button 
        onClick={handlePayment} 
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg"
      >
        {loading ? 'Cargando...' : 'Pagar con Wompi'}
      </Button>
      {errorMsg && <p className="text-red-500 text-sm mt-2 font-medium">{errorMsg}</p>}
    </div>
  );
}
