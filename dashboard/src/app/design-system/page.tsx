import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-10 pb-32">
      <div className="max-w-5xl mx-auto space-y-16">
        
        <header className="space-y-4">
          <Badge variant="default">Vibe Coding V1</Badge>
          <h1 className="text-4xl font-bold tracking-tight">Design System Showcase</h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Librería HTML de componentes usando los nuevos tokens estéticos (Polar Blue & Dark Mode First).
            Todos los componentes consumen `globals.css`.
          </p>
        </header>

        {/* --- BUTTONS --- */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold border-b border-border pb-2">Botones</h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground block">Default (Primary CTA)</span>
              <Button>Guardar Cambios</Button>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground block">Secondary</span>
              <Button variant="secondary">Cancelar</Button>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground block">Outline</span>
              <Button variant="outline">Configuración Avanzada</Button>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground block">Ghost</span>
              <Button variant="ghost">Ver Detalles</Button>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground block">Destructive</span>
              <Button variant="destructive">Eliminar Asistente</Button>
            </div>
          </div>
        </section>

        {/* --- CARDS --- */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold border-b border-border pb-2">Tarjetas (Cards)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Capacidad de tus mensajes</CardTitle>
                <CardDescription>Resumen de tu consumo este mes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <span className="font-medium">Mensajes Enviados</span>
                  <Badge variant="secondary">1,240 / 5,000</Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  ¡Todo al día por aquí! Tu asistente de WhatsApp está listo para responder en cuanto llegue el próximo mensaje.
                </p>
              </CardContent>
              <CardFooter className="flex justify-end gap-3">
                <Button variant="outline">Ver Historial</Button>
                <Button>Actualizar Plan</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Base de Conocimiento</CardTitle>
                <CardDescription>Archivos que el agente utiliza para responder.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border border-dashed border-border rounded-lg p-8 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Dale información a tu asistente. Sube la lista de tus productos, precios o preguntas frecuentes.
                  </p>
                  <Button variant="secondary">Subir Archivo PDF/Excel</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* --- FORMS & INPUTS --- */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold border-b border-border pb-2">Formularios (Inputs & Textareas)</h2>
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Instrucciones del Asistente</CardTitle>
              <CardDescription>Dile a tu vendedor cómo debe comportarse.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Prompt del Sistema</label>
                <Textarea 
                  placeholder="Ej: Eres un vendedor amable. Saluda siempre diciendo 'Hola, soy tu asistente de tienda'..." 
                  className="h-32 bg-background border-border"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Guardar Instrucciones</Button>
            </CardFooter>
          </Card>
        </section>
        
      </div>
    </div>
  );
}
