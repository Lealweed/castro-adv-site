export function PublicFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-2 text-sm text-slate-300">
          <div className="text-white font-semibold">Castro e Oliveira Advocacia</div>
          <div className="text-slate-300">
            Site institucional e informativo. Atendimento mediante análise do caso concreto.
          </div>
          <div className="mt-4 text-xs text-slate-400">
            © {new Date().getFullYear()} Castro e Oliveira Advocacia. Todos os direitos reservados.
          </div>
        </div>
      </div>
    </footer>
  );
}
