import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="h-24 animate-pulse bg-gray-100" />
      ))}
    </div>
  );
}
