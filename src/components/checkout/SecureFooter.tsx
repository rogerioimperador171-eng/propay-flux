export function SecureFooter() {
  return (
    <footer className="mt-8 space-y-3 border-t border-border pt-5 text-center">
      <div className="space-y-0.5">
        <p className="text-[11px] text-muted-foreground">Você está em</p>
        <p className="text-xs font-extrabold uppercase tracking-wide text-price">
          Ambiente Seguro <span aria-hidden="true">🔒</span>
        </p>
        <p className="text-[11px] text-muted-foreground">SSL Criptografia 128 bits</p>
      </div>
      <p className="mx-auto max-w-xs text-[10px] leading-relaxed text-muted-foreground">
        Ao comprar, declaro ciência de que a plataforma apenas é a tecnologia de venda utilizada,
        sem responsabilidade ou controle prévio sobre produto, conteúdo ou oferta, e aceito os
        Termos de Compra, Uso e Política de Privacidade.
      </p>
    </footer>
  );
}
