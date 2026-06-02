
Mover os blocos **Tema** e **Paleta** para uma página dedicada **Configurações**, acessível pelo item já existente na lista do Perfil.

### Arquivos

**Novo: `src/routes/configuracoes.tsx`**
- Rota `/configuracoes` com `PageHeader` (eyebrow "Perfil", title "Configurações")
- Renderiza `<ThemeToggle />` e `<PalettePicker />`
- Botão "Voltar" no topo (Link para `/perfil`)
- `head()` com title/description próprios

**Editar: `src/routes/perfil.tsx`**
- Remover `<ThemeToggle />` e `<PalettePicker />` do corpo
- Atualizar o item `Configurações` da lista para `to: "/configuracoes"`
- Manter os demais itens (Lembretes, Privacidade, Modo silencioso) apontando para `/perfil`

Sem mudanças em estilos, componentes de tema ou persistência — apenas reorganização de UI.
