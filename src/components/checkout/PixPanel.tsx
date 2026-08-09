import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { checkPixDeposit } from "@/lib/pix-client";
import { formatBRL } from "@/lib/masks";
import type { PixDeposit } from "@/lib/pix.server";

/**
 * Normaliza o QR devolvido pelo provedor: pode vir como URL, data URL, ou
 * apenas o base64 da imagem.
 */
function normalizeQrSource(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (raw.startsWith("data:") || raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }
  if (/^[A-Za-z0-9+/=\s]+$/.test(raw) && raw.length > 100) {
    return `data:image/png;base64,${raw.replace(/\s+/g, "")}`;
  }
  return raw;
}


type Props = {
  deposit: PixDeposit;
  amount: number;
  onApproved: () => void;
};

export function PixPanel({ deposit, amount, onApproved }: Props) {
  const [copied, setCopied] = useState(false);
  const [statusLabel, setStatusLabel] = useState("Aguardando pagamento");
  const [qrSource, setQrSource] = useState(() => normalizeQrSource(deposit.qrcodeUrl));
  const approvedRef = useRef(false);

  // Se o provedor não devolver imagem (ou ela falhar), o QR é gerado localmente
  // a partir do código Copia e Cola — o cliente sempre vê um QR válido.
  useEffect(() => {
    const provided = normalizeQrSource(deposit.qrcodeUrl);
    if (provided) {
      setQrSource(provided);
      return;
    }
    if (!deposit.copyPaste) {
      setQrSource("");
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(deposit.copyPaste, { margin: 1, width: 320 })
      .then((url) => {
        if (!cancelled) setQrSource(url);
      })
      .catch(() => {
        if (!cancelled) setQrSource("");
      });
    return () => {
      cancelled = true;
    };
  }, [deposit.qrcodeUrl, deposit.copyPaste]);

  const handleQrError = () => {
    if (!deposit.copyPaste) {
      setQrSource("");
      return;
    }
    QRCode.toDataURL(deposit.copyPaste, { margin: 1, width: 320 })
      .then(setQrSource)
      .catch(() => setQrSource(""));
  };


  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(async () => {
      if (approvedRef.current) return;
      try {
        const result = await checkPixDeposit(deposit.transactionId);
        if (cancelled) return;
        if (result.transactionState === "COMPLETO") {
          approvedRef.current = true;
          clearInterval(interval);
          setStatusLabel("Pagamento aprovado");
          onApproved();
        }
      } catch {
        // erro transitório de rede: segue tentando no próximo ciclo
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [deposit.transactionId, onApproved]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(deposit.copyPaste);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Não foi possível copiar. Selecione o código manualmente.");
    }
  };

  return (
    <div className="rounded-lg border-2 border-brand bg-card p-4 text-center">
      <h2 className="text-sm font-bold text-foreground">Escaneie o QR Code para pagar</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Valor: <strong className="text-price">{formatBRL(amount)}</strong>
      </p>

      {qrSource ? (
        <img
          src={qrSource}
          alt="QR Code do pagamento PIX"
          onError={handleQrError}
          className="mx-auto mt-4 h-44 w-44 rounded-lg border border-border bg-background object-contain p-2"
        />

      ) : null}

      {deposit.copyPaste ? (
        <>
          <p className="mt-4 text-xs font-semibold text-foreground">PIX Copia e Cola</p>
          <p className="mt-2 break-all rounded-lg bg-secondary px-3 py-3 text-[10px] text-muted-foreground">
            {deposit.copyPaste}
          </p>
          <Button variant="brand" size="lg" className="mt-3 w-full text-sm" onClick={copy}>
            {copied ? <Check /> : <Copy />}
            {copied ? "PIX COPIADO" : "COPIAR PIX"}
          </Button>
        </>
      ) : null}

      <p className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-warn">
        <Loader2 className="h-4 w-4 animate-spin" />
        {statusLabel}
      </p>
    </div>
  );
}
