import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
            <h1 className="text-3xl font-bold tracking-tight">Painel do Administrador</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Bem-vindo!</CardTitle>
                    <CardDescription>Esta é a sua área administrativa. futuras funcionalidades de gerenciamento aparecerão aqui.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Você está logado como administrador.</p>
                     <Button asChild className='mt-4'>
                        <Link href="/dashboard">Ir para o Painel do Usuário</Link>
                    </Button>
                </CardContent>
            </Card>
        </main>
      </div>
    </div>
  );
}