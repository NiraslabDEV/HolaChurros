# ¡Hola Churros! — Documento de Progresso

## Visão Geral
Site + painel de gestão para a Hola Churros, churreirira artesanal em Maputo, Moçambique.  
Deploy: Railway · Repositório: github.com/NiraslabDEV/HolaChurros

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Backend | Node.js + Express |
| Base de dados | PostgreSQL (via Railway plugin) |
| Frontend | HTML + CSS + Vanilla JS |
| Tipografia | Playfair Display + DM Sans (Google Fonts) |
| CSS utilitário | Tailwind CDN (dashboard apenas) |
| Deploy | Railway (auto-deploy via GitHub push) |
| Delivery | Yango (externo, sem integração) |

---

## Estrutura de Ficheiros

```
hola-churros/
├── server.js              ← API REST + servidor Express
├── package.json
├── railway.toml           ← configuração de deploy
├── .env                   ← DATABASE_URL, PORT (local)
├── DEPLOY.md
├── PROGRESSO.md           ← este ficheiro
└── public/
    ├── index.html         ← site público
    ├── dashboard.html     ← painel de administração
    ├── favicon-32.png
    ├── apple-touch-icon.png
    └── uploads/
        ├── logo.webp      ← 58KB (optimizado de 3.1MB PNG)
        └── logo-opt.png   ← fallback PNG
```

---

## Base de Dados

### Tabela `orders`
| Campo | Tipo | Descrição |
|---|---|---|
| id | SERIAL | Chave primária |
| customer_name | VARCHAR(255) | Nome do cliente |
| phone | VARCHAR(50) | Telefone/WhatsApp |
| address | TEXT | Morada de entrega |
| items | JSONB | Lista de produtos com molho |
| sauce | VARCHAR(100) | Molhos (resumo) |
| total | INTEGER | Total em MT |
| notes | TEXT | Observações |
| status | VARCHAR(50) | pendente / confirmado / entregue / cancelado |
| created_at | TIMESTAMPTZ | Data/hora do pedido |

### Tabela `events`
| Campo | Tipo | Descrição |
|---|---|---|
| id | SERIAL | Chave primária |
| contact_name | VARCHAR(255) | Nome do contacto |
| phone | VARCHAR(50) | Telefone/WhatsApp |
| event_type | VARCHAR(255) | Tipo de evento |
| event_date | DATE | Data do evento |
| location | TEXT | Local |
| start_time | TIME | Hora de início |
| end_time | TIME | Hora de fim |
| participants | INTEGER | Número de participantes |
| service | VARCHAR(100) | Só Churros / + Sorvete / + Café |
| notes | TEXT | Observações |
| status | VARCHAR(50) | pendente / confirmado / cancelado |
| created_at | TIMESTAMPTZ | Data do pedido |

---

## API Endpoints (server.js)

| Método | Rota | Descrição |
|---|---|---|
| POST | /api/orders | Criar novo pedido |
| GET | /api/orders | Listar todos os pedidos |
| PATCH | /api/orders/:id/status | Atualizar status do pedido |
| POST | /api/events | Criar solicitação de evento |
| GET | /api/events | Listar todos os eventos |
| PATCH | /api/events/:id/status | Atualizar status do evento |
| GET | /api/stats | Totais: pedidos, eventos, receita, pendentes |
| GET | / | Serve index.html |
| GET | /dashboard | Serve dashboard.html |

---

## Site Público (index.html)

### Secções
1. **Nav** — logo animado (aparece ao fazer scroll), links, botão "Encomendar"
2. **Hero** — logo grande, headline, CTA, estatísticas (2020, 841 fãs, 100% artesanal)
3. **Marquee** — faixa animada com nomes dos produtos
4. **Menu** — Churros Espanhóis (grid editorial), Recheados, Vitrine Gourmet
5. **Delivery** — horários, localização, WhatsApp
6. **Encomendas** — formulário de pedido (3 passos)
7. **Eventos** — informação + formulário de solicitação
8. **Footer** — links, horários, endereço, botão oculto para dashboard

### Formulário de Encomenda — Detalhe

**Passo 1 — Produtos**
- 5 produtos: Espanhóis 4un (250MT), 6un (320MT), 12un (580MT), Recheados 4un (600MT), 6un (900MT)
- Cada unidade adicionada tem o seu próprio selector de molho independente (Doce de Leite / Nutella)
- Extras & Coberturas (aparecem ao adicionar produtos):
  - Coberturas: Castanhas, Pistachio, Marshmallow, Smarties, Granulado de Chocolate, Coco Ralado
  - Molho Extra: Doce de Leite, Nutella
  - Cada extra: +100 MT

**Passo 2 — Entrega**
- Seletor de zona com taxa visível:

| Zona | Taxa |
|---|---|
| Dentro da cidade | 100 MT |
| Baixa | 120 MT |
| Marés / Costa do Sol | 150 MT (antes 16h) / 200 MT (após 16h, automático) |
| Malha Galene | 150 MT |
| Recolha via Yango (cliente) | 0 MT |

- Para "Recolha": oculta campo morada, mostra endereço da loja
- Campos: nome, telefone, morada, observações

**Passo 3 — Confirmar**
- Resumo completo: itens + molhos + extras + zona + taxa + total
- Botão "Enviar para WhatsApp"

**Passo 4 — Enviado (ecrã de sucesso)**
- Check animado
- Botão "Abrir WhatsApp" (navegação manual, mais fiável em mobile)
- Botão "Fazer Novo Pedido"

### Mensagem WhatsApp — Formato
```
*¡Hola Churros! — Nova Encomenda*

*Nome do Cliente*
Tel: 84 XXX XXXX
Morada: Av. exemplo, Maputo
Zona: Dentro da cidade

*Pedido:*
• Churros Espanhóis 4 unidades — Doce de Leite — 250 MT
• Churros Recheados 6 unidades — Nutella — 900 MT

*Extras:*
• Castanhas — 100 MT
• Molho Extra — Nutella — 100 MT

Entrega (Dentro da cidade): 100 MT
*Total: 1.450 MT*

Obs: sem açúcar
```

### Formulário de Eventos
- Campos: nome, telefone, tipo de evento, data, local, hora início/fim, participantes, serviço
- Serviços: Só Churros / Churros + Sorvete / Churros + Café
- Envio directo para WhatsApp + gravação na BD
- Ecrã de sucesso após envio

---

## Painel de Administração (dashboard.html)

### Acesso
- URL: `/dashboard`
- Senha: `churros2025` (hardcoded no HTML — limitação de segurança conhecida)
- Botão de acesso: ícone de cadeado no rodapé do site (visível mas discreto)

### Funcionalidades
- **Stats** — 4 cards: Total Pedidos, Total Eventos, Receita Total, Pedidos Pendentes
- **Tab Encomendas** — tabela desktop + cards mobile com:
  - ID, data/hora, cliente, telefone, itens, total, status, botão WhatsApp
  - Alterar status: pendente → confirmado → entregue / cancelado
- **Tab Eventos** — tabela desktop + cards mobile com:
  - ID, data criação, contacto, tipo, data evento, participantes, serviço, status
  - Alterar status: pendente → confirmado / cancelado

### Layout Responsivo
- Desktop: tabelas com todas as colunas
- Mobile: cards com pares label/valor e botões de ação

---

## Optimizações de Performance

| Problema | Solução |
|---|---|
| Logo 3.1MB PNG | Convertido para WebP (58KB) com `sharp`, fallback PNG 153KB |
| React + Babel CDN (~2.3MB) | Removidos completamente, formulário reescrito em Vanilla JS |
| Tailwind CDN no site | Não usado (só no dashboard); site usa CSS puro |
| Imagens lentas | `loading="lazy"` + `fetchpriority="high"` no logo |
| Logo só carregava ao scroll | `<link rel="preload">` no `<head>` |
| Favicons em falta | Gerados com `sharp`: favicon-32.png + apple-touch-icon.png |

---

## Bugs Corrigidos

| Bug | Causa | Solução |
|---|---|---|
| Botão WhatsApp não funcionava em mobile | `window.open()` após `await fetch()` bloqueado por popup blocker | `window.location.href` síncrono antes do fetch |
| Servidor crashava sem BD | Pool PostgreSQL criado mesmo sem DATABASE_URL | Pool só criado se DATABASE_URL existir |
| Barra lateral no mobile (formulário) | `prod-row` com colunas fixas overflow | Grid 2 colunas no mobile + `overflow-x: hidden` |
| Mesmo molho para todas as unidades | Estado do carrinho por produto, não por unidade | Carrinho refeito: array `[{uid, id, sauce}]` |
| "Invalid Date" no dashboard (eventos) | PostgreSQL devolvia timestamp completo, concatenação inválida | Parse manual `YYYY-MM-DD` → `DD/MM/YYYY` |

---

## Próximas Features (Por Prioridade)

### Alta prioridade
- [x] **Botão WhatsApp flutuante** — fixo no canto inferior direito em todo o site (pulse animation)
- [x] **Polling de novos pedidos no dashboard** — verifica a cada 30s, som via Web Audio API + toast notification
- [x] **Segurança do dashboard** — POST /api/auth verifica DASHBOARD_PASSWORD env var, token Bearer em todas as rotas protegidas

### Média prioridade
- [ ] **"Aberto agora / Fechado"** — indicador em tempo real no hero
- [ ] **Meta tags Open Graph** — pré-visualização bonita ao partilhar no WhatsApp
- [ ] **Ver detalhes completos do pedido** — popup/expand com todos os itens, extras, molhos, notas
- [ ] **Filtro por status e data** no dashboard
- [ ] **Estatísticas do dia** — pedidos e receita de hoje em destaque
- [ ] **Google Maps** no footer

### Menor prioridade
- [ ] **Secção de avaliações** — 3–4 comentários de clientes reais
- [ ] **Exportar CSV** — lista de pedidos do dia
- [ ] **Produto mais vendido** — estatística no dashboard
- [ ] **Rate limiting** na API
- [ ] **Validação no backend** — campos obrigatórios verificados no servidor

---

## Variáveis de Ambiente (Railway)

```
DATABASE_URL=postgresql://...  ← gerado automaticamente pelo plugin PostgreSQL
NODE_ENV=production
PORT=3000                      ← opcional, Railway define automaticamente
DASHBOARD_PASSWORD=churros2025 ← ainda não implementado no backend
```

---

## Contactos & Referências
- WhatsApp da loja: +258 85 269 0365
- Instagram: @holachurrosmz
- Endereço: Av. Amílcar Cabral, 856, Maputo
- Horário loja: Seg–Sex 09:30–18:30
- Horário delivery: 14:00–18:00
- Encomendas até: 13:30 (para receber no mesmo dia)
