
import { redirect } from 'next/navigation';

export default function AdminRootPage() {
  // Redireciona permanentemente da rota /admin para /admin/login
  redirect('/admin/login');
}
