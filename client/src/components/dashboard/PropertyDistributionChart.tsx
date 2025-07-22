import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useEffect, useRef } from "react";

interface PropertyDistribution {
  status: string;
  count: number;
}

const statusColors: Record<string, string> = {
  active: '#10b981',
  decoration: '#f59e0b',
  financing: '#3b82f6',
  inactive: '#6b7280'
};

const statusLabels: Record<string, string> = {
  active: 'Ativos',
  decoration: 'Em Decoração',
  financing: 'Financiamento',
  inactive: 'Inativos'
};

export default function PropertyDistributionChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { data: distribution = [], isLoading } = useQuery<PropertyDistribution[]>({
    queryKey: ['/api/analytics/property-distribution'],
  });

  useEffect(() => {
    if (!canvasRef.current || isLoading || distribution.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const centerX = canvas.offsetWidth / 2;
    const centerY = canvas.offsetHeight / 2;
    const radius = Math.min(centerX, centerY) - 40;

    const total = distribution.reduce((sum, item) => sum + item.count, 0);
    let currentAngle = -Math.PI / 2; // Start from top

    distribution.forEach((item) => {
      const sliceAngle = (item.count / total) * 2 * Math.PI;
      
      // Draw slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = statusColors[item.status] || '#6b7280';
      ctx.fill();

      currentAngle += sliceAngle;
    });

    // Draw center circle (donut hole)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

  }, [distribution, isLoading]);

  return (
    <Card className="border border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Distribuição por Status
          </CardTitle>
          <Button variant="ghost" size="sm">
            <ExternalLink className="w-4 h-4 mr-1" />
            Ver detalhes
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-80">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : distribution.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Nenhum imóvel cadastrado
            </div>
          ) : (
            <>
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ width: '100%', height: '100%' }}
              />
              <div className="absolute bottom-0 left-0 right-0 flex flex-wrap justify-center gap-4 text-sm">
                {distribution.map((item) => (
                  <div key={item.status} className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: statusColors[item.status] || '#6b7280' }}
                    />
                    <span className="text-gray-600">
                      {statusLabels[item.status] || item.status}: {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
