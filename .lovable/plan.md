
## Criador de temas com cores (presets) em Perfil

Adicionar um seletor de paleta logo abaixo do bloco "Tema" (claro/escuro), com 6 presets prontos. A escolha é persistida em `localStorage` e aplicada via uma classe no `<html>` que sobrescreve todos os tokens do design system (cores base, superfícies, raio de borda).

### Presets

1. **Morning Paper** (atual / default) — off-white + tinta
2. **Midnight Indigo** — navy profundo + indigo elétrico
3. **Sage & Cream** — sage muted + creme
4. **Noir & Gold** — preto + dourado luxuoso
5. **Ocean Deep** — azuis profundos + teal
6. **Terracotta** — terracota + sage

Cada preset define os tokens completos em ambos os modos (claro e escuro), então funciona em conjunto com o toggle Claro/Escuro/Sistema existente.

### Arquivos

**Novo: `src/components/PalettePicker.tsx`**
- Card no mesmo estilo do `ThemeToggle`, título "Paleta"
- Grid 3×2 com swatches circulares (4 cores cada) + nome do preset
- Estado em `localStorage` key `fm-palette`
- Aplica `data-palette="<id>"` no `<html>`
- Card ativo destacado com ring no foreground

**Editar: `src/styles.css`**
- Adicionar 6 blocos `:root[data-palette="<id>"]` sobrescrevendo todos os tokens (background, foreground, card, primary, secondary, muted, accent, border, input, ring, radius, etc.)
- Adicionar 6 blocos `.dark[data-palette="<id>"]` para a variante escura de cada preset
- Manter `Morning Paper` como o default em `:root` (sem `data-palette` necessário, mas também registrar `data-palette="paper"` por consistência)

**Editar: `src/routes/perfil.tsx`**
- Importar e renderizar `<PalettePicker />` logo após `<ThemeToggle />`

### Detalhes técnicos

- Tokens em `oklch`, seguindo o padrão atual do styles.css
- Cada preset inclui: `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--border`, `--input`, `--ring`, `--radius`
- Preset é ortogonal ao modo claro/escuro: usuário escolhe paleta E modo independentemente
- Aplicar paleta no mount com flash mínimo (script inline opcional no `__root.tsx` head — avaliar; por ora aplicar no `useEffect` como o ThemeToggle já faz)
- Sem mudanças em backend, sem novas dependências
