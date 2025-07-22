import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

interface MonthlyData {
  month: number;
  revenue: number;
  expenses: number;
}

export default function RevenueChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("1A");
  const currentYear = new Date().getFullYear();

  const { data: monthlyData = [], isLoading } = useQuery<MonthlyData[]>({
    queryKey: ['/api/analytics/monthly', currentYear],
  });

  useEffect(() => {
    if (!canvasRef.current || isLoading || monthlyData.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const chartWidth = canvas.offsetWidth - 80;
    const chartHeight = canvas.offsetHeight - 80;
    const chartX = 40;
    const chartY = 20;

    // Get max value for scaling
    const maxValue = Math.max(
      ...monthlyData.map(d => Math.max(d.revenue, d.expenses))
    );

    const scaleY = chartHeight / (maxValue * 1.1);

    // Draw grid lines
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 5; i++) {
      const y = chartY + (chartHeight * i / 5);
      ctx.beginPath();
      ctx.moveTo(chartX, y);
      ctx.lineTo(chartX + chartWidth, y);
      ctx.stroke();
    }

    // Draw revenue line
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    monthlyData.forEach((data, index) => {
      const x = chartX + (chartWidth * index / (monthlyData.length - 1));
      const y = chartY + chartHeight - (data.revenue * scaleY);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw expenses line
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    monthlyData.forEach((data, index) => {
      const x = chartX + (chartWidth * index / (monthlyData.length - 1));
      const y = chartY + chartHeight - (data.expenses * scaleY);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Add legend
    ctx.font = '12px Inter';
    ctx.fillStyle = '#10b981';
    ctx.fillText('Receitas', chartX, chartHeight + chartY + 15);
    
    ctx.fillStyle = '#ef4444';
    ctx.fillText('Despesas', chartX + 80, chartHeight + chartY + 15);

  }, [monthlyData, isLoading]);

  return (
    <Card className="border border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Receitas vs Despesas
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button 
              variant={selectedPeriod === "6M" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod("6M")}
            >
              6M
            </Button>
            <Button 
              variant={selectedPeriod === "1A" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod("1A")}
            >
              1A
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-80">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : monthlyData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Nenhum dado disponível
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              style={{ width: '100%', height: '100%' }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
