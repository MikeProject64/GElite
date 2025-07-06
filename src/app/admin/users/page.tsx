import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AdminUsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
      <Card>
          <CardHeader>
              <CardTitle>Lista de Usuários</CardTitle>
              <CardDescription>Visualize e gerencie todos os usuários cadastrados no sistema.</CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data de Cadastro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>usuario1@email.com</TableCell>
                    <TableCell>Pro</TableCell>
                    <TableCell>Ativo</TableCell>
                    <TableCell>01/07/2024</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>usuario2@email.com</TableCell>
                    <TableCell>Básico</TableCell>
                    <TableCell>Inativo</TableCell>
                    <TableCell>25/06/2024</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <p className="text-center text-muted-foreground pt-4">Funcionalidade em desenvolvimento.</p>
          </CardContent>
      </Card>
    </div>
  );
}
