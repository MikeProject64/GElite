export function Footer() {
  return (
    <footer className="w-full py-6 px-4 md:px-6 border-t">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between text-center md:text-left">
        <p className="text-sm text-muted-foreground font-body">
          &copy; {new Date().getFullYear()} ServiceWise. Todos os direitos reservados.
        </p>
        <nav className="flex gap-4 sm:gap-6 mt-4 md:mt-0">
          <a href="#" className="text-sm hover:underline underline-offset-4 text-muted-foreground font-body">
            Termos de Serviço
          </a>
          <a href="#" className="text-sm hover:underline underline-offset-4 text-muted-foreground font-body">
            Política de Privacidade
          </a>
        </nav>
      </div>
    </footer>
  );
}
