# Diagnóstico — `CompleteRegistration` ausente no Pixel do navegador

**Data do teste:** 02/09/2026
**Status:** causa raiz identificada — **não é bug de código**. Ação pendente do lado do Meta Business Manager.
**Pixel ID:** `1076135168411053`
**`fbtrace_id` de referência:** `A4KmCqaM1IH1lJEzTq0Cc6e`

> Se você abriu este arquivo porque "o registro concluído não aparece no Events Manager":
> **pare e leia a seção "Causa raiz" antes de mexer em qualquer código.**
> O rastreamento do site já foi investigado a fundo e está correto.

---

## Causa raiz

O `fbevents.js` (SDK do Pixel no navegador) **suprime o evento antes de emitir qualquer
requisição de rede**. Não há chamada para `facebook.com/tr` — nem bem-sucedida, nem cancelada —
porque a requisição nunca chega a ser criada.

Reproduzido manualmente no console do navegador, em produção:

```js
fbq('track', 'CompleteRegistration', {}, { eventID: 'teste-manual-123' })
```

Retorno literal do SDK:

```
[Meta Pixel] - You are attempting to send a restricted event.
The event was suppressed. Go to Events Manager to learn more.
  fbevents.js:202
```

**Interpretação:** a conta/pixel está sob restrição de eventos do Meta. A hipótese mais
provável é a política de dados sensíveis de **saúde** — o site é de um médico e as quatro
landing pages tratam de endometriose, SOP, obstetrícia e preparo gestacional. O Meta
restringe a coleta de eventos que possam inferir condição de saúde do usuário.

A supressão acontece **dentro do SDK, no navegador**. Nenhuma alteração no código do site
pode contorná-la — e tentar contorná-la seria violação dos termos da plataforma.

---

## O que foi descartado durante a investigação

Três hipóteses foram levantadas e **todas refutadas** pelo teste manual acima. Registradas
aqui para ninguém reinvestigar:

| Hipótese | Por que foi descartada |
|---|---|
| O redirect para `wa.link` (450 ms após o submit) abortava o beacon | Uma requisição abortada apareceria no DevTools como `(canceled)`. Não aparece nada. Além disso o `fbq` despacha de forma síncrona, e o `fetch` da CAPI já usa `keepalive: true`. |
| O guard `if (window.fbq)` avaliava falso e pulava o bloco em silêncio | `window.fbq` está definido pelo snippet inline do `<head>`, e o PageView do navegador dispara normalmente. O guard passa. |
| Artefato de observação (painel Network limpo pela navegação) | O teste manual no console, sem nenhum submit ou navegação envolvida, reproduz a supressão de forma isolada. |

**O código de tracking está correto e não deve ser alterado por causa deste sintoma.**

---

## O que foi validado como funcionando

| Item | Evidência |
|---|---|
| Pixel base carrega | `fbevents.js` carrega; `window.fbq` definido |
| `PageView` no navegador | dispara normalmente |
| `fbq('track', ...)` é executado | o SDK processa a chamada e responde — a supressão é a resposta |
| Nome do evento | `CompleteRegistration`, grafia e caixa exatas, em `pixel.js` e `backend/api/lead.js` |
| Formulário → backend | `POST /api/lead` retorna **HTTP 200** |
| CAPI → Meta | Meta responde `{"events_received":1,"messages":[]}` |
| Deduplicação | mesmo `event_id` gerado uma única vez em `pixel.js` e reaproveitado no payload do servidor (`backend/api/lead.js` respeita `body.event_id`) |
| Consistência entre as 4 LPs | bloco de tracking idêntico nas 4 LPs (pastas renomeadas em 03/09 — ver seção da remediação) |

**Ou seja: o evento existe e chega ao Meta pelo lado servidor (CAPI). O que está mudo é
exclusivamente o lado navegador.**

⚠️ **Ressalva importante:** `events_received: 1` significa que o Meta **aceitou o payload na
API** — não que o evento esteja disponível para otimização e atribuição. Sob uma restrição de
conta, o evento pode ser filtrado a jusante, já dentro do Meta. Se o `CompleteRegistration`
continuar sem aparecer no Events Manager mesmo com a CAPI retornando 200, isso **não** indica
falha do backend.

---

## Ação pendente — lado do Meta Business Manager (não é código)

Precisa ser feito por quem tem acesso ao Business Manager. Nada disso se resolve no repositório.

1. **Events Manager → Pixel `1076135168411053` → verificar avisos/restrições na conta.**
   A mensagem do SDK diz "Go to Events Manager to learn more" — o detalhe da restrição está lá.
2. **Confirmar se a restrição é da política de dados de saúde** e qual a classificação aplicada
   ao domínio/pixel.
3. **Verificar a Verificação de Domínio** e, se aplicável, a configuração de
   **Eventos Agregados (Aggregated Event Measurement)**.
4. **Avaliar com a gestora de tráfego** qual evento passa a ser o sinal de conversão. Se
   `CompleteRegistration` estiver restrito para esta vertical, pode ser necessário migrar para
   outro evento permitido, ou operar só com a CAPI.
5. Se a restrição for considerada indevida, **abrir contestação/recurso** no Events Manager.

> **Não implementar contorno técnico.** Renomear o evento, ofuscar o payload ou trocar o canal
> de envio para escapar da supressão viola os termos da plataforma e pode levar à suspensão do
> pixel ou da conta de anúncios.

---

## Achado secundário — Pixel duplicado

O console também reportou:

```
[Meta Pixel] - Duplicate Pixel ID: 1076135168411053
```

Havia **três ou quatro inicializações do mesmo Pixel ID por página**, e o `PageView` do
navegador disparava **3 vezes** por carregamento.

**Já corrigido no código** (mesmo commit deste documento): o bloco de tracking morto foi
removido do `script.js` — ele reinicializava o pixel e disparava um `PageView` próprio, além de
conter um `window.__capiLead` órfão que ninguém chamava. Hoje o Pixel é inicializado **uma única
vez por página**, no `<head>`:

| Página | Linha do `fbq('init', ...)` |
|---|---|
| `index.html` | 66 |
| `v3s/index.html` | 71 |
| `v4pg/index.html` | 71 |
| `v2o/index.html` | 71 |

### ⚠️ Pendência fora do repositório

A contagem de 3 `PageView` indica que o contêiner **GTM `GTM-T86QGDZJ` tem uma tag de Meta
Pixel própria**, disparando um `PageView` sem `event_id` compartilhado — o que impede a
deduplicação com a CAPI e infla a métrica.

**Essa tag precisa ser desativada no painel do GTM.** Não há como removê-la pelo código deste
repositório.

---

## Observabilidade adicionada

Para que este modo de falha nunca mais exija uma investigação do zero, o commit que acompanha
este documento adicionou logs permanentes:

- **`pixel.js`** — modo verboso com `?capi_debug=1` na URL (ou `localStorage.capi_debug = "1"`),
  logando `event_name`, `event_id`, payload enviado e resposta crua do backend. Erros de
  rede/CORS/HTTP são logados **sempre**, com prefixo `[CAPI]`. PII (`name`/`email`/`phone`)
  nunca vai para o console — aparece mascarada como `<preenchido>`/`<vazio>`.
- **`form/formulario.js`** — falha no envio ao LocalBoost loga `console.error` com status e
  corpo da resposta **independente de `data-debug`**, deixando explícito que o
  `CompleteRegistration` não foi disparado.
- **`backend/`** — cada requisição loga `event_name`/`event_id` na entrada e a resposta do Meta
  na saída, com `fbtrace_id` e mensagem de erro quando recusada. Config ausente e origem CORS
  bloqueada agora deixam rastro nos logs da Vercel.

Como validar um envio bem-sucedido está descrito no `backend/README.md` e no `.env.example`.

---

## Remediação de conteúdo e URL — 03/09/2026

Executada a remediação de **conteúdo e URL**, para retirar do site os sinais que
provavelmente motivaram a classificação de categoria sensível. **Nada de tracking foi
alterado:** `pixel.js`, `backend/` e a lógica de disparo em `form/formulario.js` seguem
intocados, e o evento continua se chamando `CompleteRegistration`.

### Mapa de renomeação das pastas

| Antes | Depois | LP |
|---|---|---|
| `obstetricia/` | `v2o/` | V2 — Obstetrícia / pré-natal |
| `sop/` | `v3s/` | V3 — SOP |
| `preparo-gestacional/` | `v4pg/` | V4 — Preparo gestacional |
| `/` (raiz) | *(inalterada)* | V1 — Endometriose |

Feito com `git mv`, preservando o histórico. **As URLs antigas deixaram de existir e não há
redirect** — isso é intencional: o objetivo é que as URLs não revelem mais a condição clínica.
Quem tiver link antigo salvo receberá 404.

### O que mudou, e por quê

1. **URLs neutras.** O `event_source_url` (que continua sendo `location.href`, sem alteração
   no código) deixa de carregar o nome da condição em toda requisição enviada ao Meta. A
   atribuição por LP fica preservada pelos próprios slugs.
2. **Copy em terceira pessoa.** O problema nunca foi *mencionar* endometriose, SOP ou
   obstetrícia — isso descreve o serviço e permanece nos `<title>` e no corpo dos textos. O
   problema era **afirmar que quem está lendo tem a condição** ("a dor que você sente", "seus
   sintomas", "Tenho SOP", "Você já está grávida"). Todo esse tipo de construção foi reescrito
   para descrever o serviço, não o leitor.
3. **Chips de autoidentificação removidos.** Na V4, a lista `Tenho SOP` / `Tenho endometriose`
   / `Quero engravidar` era o caso mais explícito de autodeclaração de condição de saúde.
   Substituída por etapas do acompanhamento (`Investigação do casal`, `Ajuste hormonal`,
   `Apoio nutricional`, `Acompanhamento contínuo`).
4. **Links de WhatsApp sem a condição.** O parâmetro `text=` dos CTAs não cita mais
   endometriose, SOP, ovário policístico, pré-natal ou preparo gestacional. Passou a ser
   `"Olá! Gostaria de agendar uma consulta com o Dr. Guilherme Ângelo. (Vn)"`, onde `Vn` é o
   código de origem (V1–V4) para a secretária identificar a LP. Antes, a condição vazava para
   fora do site, no corpo da mensagem enviada ao WhatsApp.

O `data-redirect="https://wa.link/q2fpx1"` do formulário **não mudou** — é encurtado, sem
parâmetros, já estava limpo.

### Próximo passo — Gabi

**Solicitar reavaliação junto ao suporte do Meta**, depois que a remediação estiver publicada
em produção. Levar para o chamado:

- O `fbtrace_id` de referência: `A4KmCqaM1IH1lJEzTq0Cc6e`
- As URLs novas (`/`, `/v2o/`, `/v3s/`, `/v4pg/`), já sem os slugs que citavam condições
- O argumento de que o site descreve **um serviço médico**, sem inferir nem afirmar condição de
  saúde de quem visita
- O pedido de remoção da restrição sobre o evento `CompleteRegistration` para este pixel

⚠️ **Publicar antes de abrir o chamado.** Se o Meta reavaliar as páginas antigas ainda no ar, a
remediação não conta.

⚠️ Segue valendo: **nenhum contorno técnico**. Não renomear o evento, não criar evento
customizado, não trocar o canal de envio para escapar da supressão.

---

## Histórico

| Data | Evento |
|---|---|
| 02/09/2026 | Diagnóstico completo do fluxo (front → CAPI → Meta). Código de tracking auditado e considerado correto. |
| 02/09/2026 | Teste em produção: `fbq` manual no console reproduz a supressão. Causa raiz identificada como restrição do lado do Meta. |
| 02/09/2026 | Commit de observabilidade, limpeza de duplicação e normalização de dados. Lógica de disparo **não alterada**. |
| 03/09/2026 | Remediação de conteúdo e URL: pastas renomeadas para `v2o/`, `v3s/`, `v4pg/`; copy reescrita em terceira pessoa nas 4 LPs; chips de autoidentificação removidos; links de WhatsApp neutralizados. Tracking **não alterado**. |
| — | *(pendente)* Gabi solicitar reavaliação junto ao suporte do Meta, após a publicação da remediação. |

**Até haver retorno da gestora, nada relacionado a tracking deve ser alterado neste repositório.**
