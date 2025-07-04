
import { InventoryClient } from "./inventory-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

// This is now a Server Component by default
export default function InventarioPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Gestão de Inventário</h1>
        {/* The button to open the dialog is now inside the client component */}
      </div>

      <InventoryClient />
    </div>
  );
}
