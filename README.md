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
