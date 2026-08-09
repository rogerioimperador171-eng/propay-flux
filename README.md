# EspiaZap — Funil + Checkout PIX (ProPixBR)

Aplicação React + Vite + TypeScript (TanStack Start) com o funil estático em `public/`
(`/lp`, `/vsl`, `/verificacao`, `/whatsapp`, `/marido`, `/esposa`) e o checkout em `/checkout`.

O pagamento PIX usa a API **https://api.propixbr.com** através de **Netlify Functions**,
para que `x-client-secret` **nunca** apareça no frontend.

---

## 1. Variáveis de ambiente

| Variável               | Descrição                              |
| ---------------------- | -------------------------------------- |
| `PROPAY_CLIENT_ID`     | Client ID da ProPixBR (`live_...`)     |
| `PROPAY_CLIENT_SECRET` | Client Secret da ProPixBR (`sk_...`)   |
| `PROPAY_BASE_URL`      | Opcional. Padrão `https://api.propixbr.com` |

Na Netlify: **Site configuration → Environment variables → Add a variable**.
Cadastre as duas variáveis com o escopo **Functions** (ou **All scopes**).

> Importante: variáveis cadastradas somente no GitHub não são transferidas
> automaticamente para a Netlify. Não coloque os valores no código, no
> `netlify.toml` ou no repositório. Eles precisam existir também no painel da
> Netlify para que as Functions consigam autenticar na ProPixBR.

Localmente: crie um arquivo `.env` na raiz (não commite):

```
PROPAY_CLIENT_ID=live_xxxxxxxxxxxxxxxx
PROPAY_CLIENT_SECRET=sk_xxxxxxxxxxxxxxxx
```

### Como trocar o Client ID / Client Secret

Basta alterar os valores das variáveis acima na Netlify e clicar em
**Deploys → Trigger deploy → Clear cache and deploy site**.
Nenhuma alteração de código é necessária — as credenciais são lidas apenas em
`netlify/functions/_propay.ts`.

---

## 2. Como publicar na Netlify

1. Suba o repositório para o GitHub.
2. Na Netlify: **Add new site → Import an existing project** e selecione o repositório.
3. As configurações já vêm do `netlify.toml`:
   - build: `npm run build`
   - publish: `dist`
   - functions: `netlify/functions`
4. Cadastre `PROPAY_CLIENT_ID` e `PROPAY_CLIENT_SECRET`.
5. Em **Deploys**, escolha **Trigger deploy → Clear cache and deploy site**.

O `netlify.toml` também cria:

- `/api/public/pix/create` → função `pix-create`
- `/api/public/pix/status` → função `pix-status`
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
checkout gera PIX real em `http://localhost:8888/checkout`.

Build de produção:

```sh
npm run build
```

---

## 4. Fluxo do pagamento PIX

1. Usuário clica em **PAGAR COM PIX** no `/checkout`.
2. O frontend chama `POST /api/public/pix/create` (Netlify Function).
3. A function faz `POST https://api.propixbr.com/api/v1/deposit` com os headers
   `x-client-id`, `x-client-secret`, `Content-Type: application/json`
   e o corpo `{ amount, description, payerName, payerDocument }`.
4. Retorna `transactionId`, `copyPaste`, `qrcodeUrl`, `status`.
5. A tela mostra imediatamente o **QR Code**, o **PIX Copia e Cola**, o botão
   **COPIAR PIX** e o status *Aguardando pagamento*.
6. A cada **3 segundos** o app chama `POST /api/public/pix/status` com o
   `transactionId`, que consulta `POST /api/v1/check`.
7. Quando `transactionState` = `COMPLETO`, o polling para e a tela de
   pagamento aprovado aparece — sem recarregar a página.

Erros da API, falta de credenciais e timeout (20s) exibem mensagem amigável com
opção de **tentar novamente**; o site nunca quebra.

### Roteamento (e a mensagem "Only HTML requests are supported here")

Essa mensagem vinha do handler de **SSR** do app: na Netlify o `POST` para
`/api/public/pix/create` era capturado pela função de SSR (`path = "/*"`) antes
de chegar à Netlify Function, e o SSR só aceita requisições HTML.

Correção aplicada: o frontend chama primeiro a **URL nativa** da Function —
`/.netlify/functions/pix-create` e `/.netlify/functions/pix-status`. O Netlify
reserva `/.netlify/*` e nunca o encaminha para o SSR, então a Function sempre
recebe o POST. Se essas URLs não existirem (preview da Lovable, onde não há
Netlify Functions), o cliente cai automaticamente nas rotas de servidor do app
`/api/public/pix/*`, que usam exatamente as mesmas credenciais do servidor.

O QR Code também tem redundância: usa a imagem do provedor e, se ela vier vazia
ou falhar, é gerada localmente a partir do código Copia e Cola.

---

## 5. Como atualizar a API futuramente

Todo o contato com o provedor está isolado em:

- `netlify/functions/_propay.ts` — base URL, headers e tratamento de erro/timeout
- `netlify/functions/pix-create.ts` — criação do depósito (`/api/v1/deposit`)
- `netlify/functions/pix-status.ts` — consulta (`/api/v1/check`)
- `src/lib/pix-client.ts` — chamadas do frontend
- `src/lib/pix.schemas.ts` — formato das respostas

Para mudar de provedor ou de endpoint, altere apenas esses arquivos; o
checkout e o funil continuam iguais.

---

## 6. Vídeo da VSL

O vídeo (`espiazap-vsl.mp4`, ~73 MB) fica no CDN e é referenciado por
`src/assets/espiazap-vsl.mp4.asset.json` e por `public/vsl/index.html`.
O player (`public/vsl/js/player.js`) não permite pular, voltar ou adiantar;
só há o botão pequeno de tela cheia no canto inferior direito.
