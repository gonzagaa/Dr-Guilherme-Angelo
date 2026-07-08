# Landing Page — Endometriose · Dr. Guilherme Ângelo

Landing page de página única, estática (HTML/CSS/JS puro, sem framework e sem build step).

## Como rodar

Basta abrir o arquivo `index.html` no navegador (duplo clique) ou hospedar a pasta inteira em qualquer serviço de arquivos estáticos (Netlify, Vercel, GitHub Pages, hospedagem tradicional, etc.). Não há dependências de build.

Para desenvolvimento local com um servidor (recomendado para o mapa/fontes carregarem sem restrições), qualquer um destes serve:

```
# Python
python -m http.server 8000

# Node
npx serve
```

Depois acesse `http://localhost:8000`.

## Estrutura

```
/index.html      → marcação da página (copy verbatim)
/styles.css      → estilos (paleta, tipografia, layout responsivo)
/script.js       → CTA único + animações de entrada
/images/         → placeholders (substituir pelos definitivos)
/README.md
```

## Destino dos botões (CTA)

Todos os botões apontam para o **mesmo destino**, definido em UMA constante no topo de `script.js`:

```js
const LINK_CTA = "https://wa.me/5562998139185?text=...";
```

Para trocar o canal de agendamento (WhatsApp, formulário, telefone), altere **apenas essa linha**. Todos os CTAs são atualizados automaticamente e abrem em nova aba.

## Imagens a substituir

Todos os arquivos abaixo são **placeholders** que já renderizam (fundo na paleta da marca, borda tracejada dourada e rótulo). Para publicar, basta **substituir o arquivo pelo definitivo mantendo o mesmo nome e proporção**. Nada no código precisa mudar.

| Arquivo | Proporção / tamanho alvo | Finalidade |
|---|---|---|
| `images/logo.svg` | livre (horizontal) | Logo na hero e no rodapé |
| `images/hero-desktop.png` | **16:9** | Fundo full-bleed da hero no desktop (`object-fit: cover`, `object-position: right center` — deixe o rosto à direita) |
| `images/hero-mobile.jpg` | **9:16** | Fundo full-bleed da hero no mobile (`object-fit: cover`, centralizado) |
| `images/dr-guilherme.jpg` | retrato **~4:5** | Foto do Dr. Guilherme (dobra 3) |
| `images/depoimento-01.png` … `depoimento-09.png` | mesma largura, alturas variáveis | 9 prints de depoimento (mural / masonry na dobra 4) |

> A troca desktop/mobile da hero é feita via `<picture>` com `media` queries — mantenha `hero-desktop.jpg` (16:9) e `hero-mobile.jpg` (9:16) separados.

## Mapa

O mapa da dobra 3 **não** é imagem: é um `<iframe>` real do Google Maps apontando para o endereço da Clínica Presence (R. T-44, 300 - St. Bueno, Goiânia - GO). Não requer chave de API.

## Notas de marca

- Paleta fixa: `--navy #282E3C`, `--gold #D9AF89`, `--paper #F4F4F4` (definidas como CSS variables em `styles.css`).
- Tipografia via Google Fonts: **Archivo** (títulos/eyebrows), **Instrument Sans** (corpo), **Fraunces italic** (pull-quotes).
- Sem navegação/menu/header — a página começa direto na hero, conforme especificado.

---

## LP v2 — Obstetrícia / Pré-natal particular (`/v2/`)

Segunda página, em `/v2/index.html`. **Reaproveita** `../styles.css` e `../script.js`; estilos exclusivos ficam em `/v2/styles-v2.css` (carregado depois do global). A LP1 da raiz não foi alterada.

**Imagens compartilhadas (reusadas de `../images/`):** mesmo banner da hero (`hero-desktop.avif` / `hero-mobile.avif`), `logo.png`, o retrato `sobre.avif` na seção 6 e os **10 depoimentos reais** `../images/depoimentos/depo gui 1.avif … depo gui 10.avif` (carrossel da seção 5).

**Placeholders novos a substituir (em `/v2/images/`):**

| Arquivo | Proporção | Finalidade |
|---|---|---|
| `momento-01.jpg` | destaque (retrato) | Mosaico da seção 4 — foto grande (2×2 no desktop) |
| `momento-02.jpg` … `momento-05.jpg` | livre | Mosaico da seção 4 — fotos menores (`object-fit: cover`) |

> Os arquivos `v2-depoimento-01…03.png` em `/v2/images/` ficaram sem uso (o carrossel passou a usar os depoimentos reais de `../images/depoimentos/`) — pode apagá-los.

> ⚠️ **Revisar copy da seção 6:** o parágrafo do bloco médico ainda está com texto de **endometriose** (marcado no HTML com `<!-- REVISAR: texto de endometriose em página de obstetrícia -->`). O cliente vai substituir.
>
> Os botões da v2 apontam direto para o WhatsApp com texto de **pré-natal** (não usam `data-cta`, para o `../script.js` não sobrescrever com o texto de endometriose da LP1).

---

## LP v3 — SOP / Ovário Policístico (`/v3/`)

Terceira página, em `/v3/index.html`. Estrutura praticamente idêntica à LP1. **Reaproveita** `../styles.css` e `../script.js`; estilos exclusivos (chips de sintomas, stats de autoridade, CTA centralizado) em `/v3/styles-v3.css`. LP1 e v2 não foram alteradas.

**Imagens — todas reaproveitadas de `../images/`** (a v3 **não** tem imagens próprias): banner da hero (`hero-desktop.avif` / `hero-mobile.avif`), `logo.png`, retrato `sobre.avif` (dobra 3) e os 9 depoimentos `../images/depoimentos/depo google gui 1…9.avif` (carrossel).

- **Componente novo:** chips de sintomas na hero (`.chips` / `.chip`) — apenas visuais, sem link/filtro. **As regras base `.chips`/`.chip` foram movidas para o `styles.css` global** (compartilhadas com a v4); a v3 mantém só o ajuste de densidade da hero.
- Os botões da v3 apontam direto para o WhatsApp com texto de **SOP / ovário policístico** (sem `data-cta`).

---

## LP v4 — Preparo Gestacional · SOP & Endometriose (`/v4/`)

Quarta página, em `/v4/index.html`. Fundo de funil (mulheres com SOP/endometriose que querem engravidar). **Reaproveita** `../styles.css` e `../script.js`; estilos exclusivos em `/v4/styles-v4.css` (kicker itálico, densidade da hero, e cópias dos componentes reusados — card escuro `.info-card`/`for-who`, `.symptoms--stacked`, `.authority`, `.section__cta`). Chips vêm do global.

**Imagens — todas reaproveitadas de `../images/`** (a v4 não tem imagens próprias): banner (`hero-desktop.avif` / `hero-mobile.avif`), `logo.png`, retrato `sobre.avif` (dobra 4) e os 9 depoimentos `depo google gui 1…9.avif` (carrossel).

- **Componentes:** tags de diagnóstico (chips compartilhados), card escuro "box de virada", 4 passos (lista stacked), 3 stats de autoridade, kicker itálico na hero e no CTA final.
- Os botões da v4 apontam direto para o WhatsApp com texto de **preparo gestacional** (sem `data-cta`).
