# Backend CAPI — Meta Conversions API (Vercel)

Backend serverless mínimo para enviar eventos **server-side** para o Meta (Facebook):

- `POST /api/pageview` → evento **PageView**
- `POST /api/lead` → evento **CompleteRegistration** (registro concluído), com os dados do lead hasheados (SHA-256) no servidor.

Sem dependências (usa `fetch` nativo + `node:crypto`). Serve as 4 landing pages.

---

## Deploy no Vercel (pasta isolada do repositório)

1. No Vercel: **Add New → Project** e conecte este repositório do GitHub.
2. Em **Root Directory**, selecione a pasta **`backend`**. (Assim o Vercel deploya só o backend, não o site.)
3. **Framework Preset:** `Other`. Não precisa de build command.
4. Adicione as **variáveis de ambiente** abaixo e clique em **Deploy**.
5. Anote a URL do projeto (ex.: `https://seu-projeto.vercel.app`) — é ela que as páginas vão chamar.

---

## Variáveis de ambiente (Vercel → Settings → Environment Variables)

| Nome | Valor | Obrigatória |
|---|---|---|
| `FB_PIXEL_ID` | `1076135168411053` | ✅ |
| `FB_CAPI_TOKEN` | *(o token de acesso da CAPI — **gere um novo** no Events Manager)* | ✅ |
| `ALLOWED_ORIGINS` | domínio(s) de produção das LPs, separados por vírgula — ex.: `https://drguilhermeangelo.com.br,https://www.drguilhermeangelo.com.br` | Recomendada |
| `FB_TEST_EVENT_CODE` | código de teste do Events Manager (só enquanto estiver testando; **remova depois**) | Opcional |

> **Segurança:** o `FB_CAPI_TOKEN` é secreto e vive **só aqui** (nunca no HTML/JS do site).
> **Rotacione o token** que foi colado no chat — ele está exposto.
> Se `ALLOWED_ORIGINS` ficar vazio, o CORS libera `*` (funciona, mas menos seguro).

---

## Como as páginas chamam (contrato)

**PageView** — no carregamento de cada página:
```js
fetch("https://SEU-BACKEND.vercel.app/api/pageview", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    event_source_url: location.href,
    event_id: "<uuid>",     // opcional (dedupe com o Pixel do navegador)
    fbp: "<cookie _fbp>",   // opcional
    fbc: "<cookie _fbc>"    // opcional
  })
});
```

**CompleteRegistration** — quando o formulário é enviado com sucesso:
```js
fetch("https://SEU-BACKEND.vercel.app/api/lead", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "...", email: "...", phone: "...",  // hasheados no servidor
    event_source_url: location.href,
    event_id: "<uuid>", fbp: "...", fbc: "..."
  })
});
```

O IP e o User-Agent são lidos automaticamente do request (não precisam ser enviados).

---

## Teste rápido

Com `FB_TEST_EVENT_CODE` setado, abra o **Events Manager → Testar eventos** e faça:
```bash
curl -X POST https://SEU-BACKEND.vercel.app/api/pageview \
  -H "Content-Type: application/json" \
  -d '{"event_source_url":"https://exemplo.com/"}'
```
O evento deve aparecer em "Testar eventos" em alguns segundos.
