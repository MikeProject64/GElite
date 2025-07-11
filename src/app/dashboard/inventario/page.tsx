
import { InventoryClient } from "./inventory-client";

// This is now a Server Component by default
export default function InventarioPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Gestão de Inventário</h1>
      </div>
      <InventoryClient />
    </div>
  );
}
