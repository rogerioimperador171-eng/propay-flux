# EspiaZap — Funil + Checkout Pix e Cartão (AmploPay)

Aplicação React + Vite + TypeScript (TanStack Start) com o funil estático em `public/`
(`/lp`, `/vsl`, `/verificacao`, `/whatsapp`, `/marido`, `/esposa`) e o checkout em `/checkout`.

Os pagamentos (Pix e cartão) usam a API da **AmploPay** através de **Netlify Functions**,
para que as chaves **nunca** apareçam no frontend. Os pedidos ficam no **Netlify Database**.

---

## 1. Variáveis de ambiente

| Key (nome)            | Value (valor)                               |
| --------------------- | ------------------------------------------- |
| `AMPLOPAY_PUBLIC_KEY` | Chave pública da AmploPay (`x-public-key`)  |
| `AMPLOPAY_SECRET_KEY` | Chave secreta da AmploPay (`x-secret-key`)  |

Na Netlify: **Site configuration → Environment variables → Add a variable**.
Cadastre as duas variáveis com o escopo **Functions** (ou **All scopes**) e,
depois, faça um novo deploy. Não coloque os valores no código nem no repositório.

As variáveis antigas `PROPAY_CLIENT_ID` / `PROPAY_CLIENT_SECRET` não são mais usadas
e podem ser apagadas.

---

## 2. Como publicar na Netlify

1. Suba o repositório para o GitHub.
2. Na Netlify: **Add new site → Import an existing project** e selecione o repositório.
3. As configurações já vêm do `netlify.toml`:
   - build: `npm run build`
   - publish: `dist`
   - functions: `netlify/functions`
4. Cadastre `AMPLOPAY_PUBLIC_KEY` e `AMPLOPAY_SECRET_KEY`.
5. Em **Deploys**, escolha **Trigger deploy → Clear cache and deploy site**.

O `netlify.toml` também cria:

- `/api/pay/create` → função `pay-create`
- `/api/pay/status` → função `pay-status`
- `/` → `/lp/index.html` (entrada do funil)
- `/__l5e/*` → proxy do CDN onde está hospedado o vídeo da VSL (73 MB, fora do repositório)
- `/*` → função SSR do app React (ex.: `/checkout`)

---

## 3. Como testar localmente

```sh
npm i
npm run dev            # apenas o app React/Vite
```

Para testar **com as Netlify Functions** (recomendado antes de publicar):

```sh
npm i -g netlify-cli
netlify dev
```

O `netlify dev` carrega o `.env`, sobe as functions e o Vite juntos, então o
checkout gera Pix/cartão real em `http://localhost:8888/checkout`.

Build de produção:

```sh
npm run build
```

---

## 4. Fluxo do pagamento

1. No `/checkout` o comprador escolhe **Pix** ou **Cartão**.
2. O frontend chama `POST /.netlify/functions/pay-create`. A função recalcula o
   total no servidor (`src/lib/pricing.ts`), grava o pedido e chama
   `POST https://app.amplopay.com/api/v1/gateway/pix/receive` ou
   `.../card/receive` com os headers `x-public-key` e `x-secret-key`.
3. Pix: a tela mostra o QR Code e o Copia e Cola; a cada 3 s consulta
   `pay-status`. Cartão: aprovado na hora vai direto para a tela de sucesso;
   em análise, o status é acompanhado da mesma forma.
4. A AmploPay avisa as mudanças de status em `amplopay-webhook` (URL assinada
   por pedido enviada como `callbackUrl`), que marca o pedido como pago.

## 5. Rastreamento (Safyro)

`public/tracking/pixels.js` contém o Safyro Tracker (Meta Pixel + CAPI) e é
carregado em todas as páginas do funil e no checkout.

- **InitiateCheckout**: disparado automaticamente ao abrir `/checkout`.
- **Purchase**: disparado quando a AmploPay confirma a venda (Pix ou cartão) —
  pelo navegador e pelo servidor (webhook), com o mesmo `eventID` (id do
  pedido) para o Meta deduplicar.

---

## 6. Vídeo da VSL

O vídeo (`espiazap-vsl.mp4`, ~73 MB) fica no CDN e é referenciado por
`src/assets/espiazap-vsl.mp4.asset.json` e por `public/vsl/index.html`.
O player (`public/vsl/js/player.js`) não permite pular, voltar ou adiantar;
só há o botão pequeno de tela cheia no canto inferior direito.
