import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full py-6 px-4 md:px-6 border-t">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between text-center md:text-left px-4 md:px-6 lg:px-16">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Gestor Elite. Todos os direitos reservados.
        </p>
        <nav className="flex gap-4 sm:gap-6 mt-4 md:mt-0">
          <Link href="/termos-de-servico" className="text-sm hover:underline underline-offset-4 text-muted-foreground">
            Termos de Serviço
          </Link>
          <Link href="/politica-de-privacidade" className="text-sm hover:underline underline-offset-4 text-muted-foreground">
            Política de Privacidade
          </Link>
        </nav>
      </div>
    </footer>
  );
}
