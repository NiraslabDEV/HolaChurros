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
| Email | Nodemailer (SMTP configurável — Gmail, etc.) |

---

## Estrutura de Ficheiros

```
hola-churros/
├── server.js              ← API REST + servidor Express + email
├── package.json
├── railway.toml           ← configuração de deploy
├── .env                   ← DATABASE_URL, PORT, SMTP_*, SITE_URL (local)
├── DEPLOY.md
├── PROGRESSO.md           ← este ficheiro
└── public/
    ├── index.html         ← site público
    ├── dashboard.html     ← painel de administração
    ├── review.html        ← página de avaliação do cliente (via token)
    ├── favicon-32.png
    ├── apple-touch-icon.png
    └── uploads/
        ├── logo.webp      ← 58KB (optimizado de 3.1MB PNG)
        ├── logo-opt.png   ← fallback PNG
        └── [fotos SEO].webp ← imagens reais com nomes optimizados
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
| extras | JSONB | Extras e coberturas seleccionados |
| status | VARCHAR(50) | pendente / confirmado / a caminho / entregue / cancelado |
| email | VARCHAR(255) | Email do cliente (opcional, para notificações) |
| review_token | VARCHAR(64) | Token único para link de avaliação |
| review_sent | BOOLEAN | Se o email de avaliação já foi enviado |
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

### Tabela `analytics`
| Campo | Tipo | Descrição |
|---|---|---|
| id | SERIAL | Chave primária |
| event | VARCHAR(50) | Nome do evento (pageview, menu_clicked, wa_sent…) |
| session_id | VARCHAR(64) | ID de sessão anónimo |
| metadata | JSONB | Dados extra (zona, nº itens…) |
| created_at | TIMESTAMPTZ | Timestamp |

### Tabela `reviews`
| Campo | Tipo | Descrição |
|---|---|---|
| id | SERIAL | Chave primária |
| order_id | INTEGER | FK → orders.id |
| email | VARCHAR(255) | Email do cliente (para fidelidade) |
| rating | INTEGER | Avaliação 1–5 estrelas |
| comment | TEXT | Comentário opcional |
| created_at | TIMESTAMPTZ | Data da avaliação |

---

## API Endpoints (server.js)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | /api/auth | — | Login dashboard, devolve token Bearer |
| POST | /api/orders | — | Criar pedido; aceita email, gera review_token, envia email confirmação |
| GET | /api/orders | ✅ | Listar todos os pedidos |
| PATCH | /api/orders/:id/status | ✅ | Actualizar status; envia email automático ao cliente |
| POST | /api/events | — | Criar solicitação de evento |
| GET | /api/events | ✅ | Listar todos os eventos |
| PATCH | /api/events/:id/status | ✅ | Actualizar status do evento |
| GET | /api/stats | ✅ | Totais: pedidos, eventos, receita, pendentes, hoje, avaliações |
| POST | /api/analytics | — | Registar evento de analytics (fire-and-forget) |
| GET | /api/analytics/funnel | ✅ | Dados do funil de conversão |
| GET | /api/review/:token | — | Info do pedido para página de avaliação (público, só campos seguros) |
| POST | /api/review/:token | — | Submeter avaliação; devolve contagem de fidelidade |
| GET | /api/reviews | ✅ | Listar todas as avaliações (admin) |
| GET | /review/:token | — | Serve review.html |
| GET | /dashboard | — | Serve dashboard.html |
| GET | / | — | Serve index.html |

---

## Sistema de Emails (Nodemailer)

### Configuração (variáveis de ambiente Railway)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=holachurros@gmail.com
SMTP_PASS=[App Password do Gmail — em Conta Google → Segurança → Senhas de app]
SMTP_FROM=holachurros@gmail.com   ← opcional, usa SMTP_USER por defeito
SITE_URL=https://holachurrosmz.up.railway.app
```

### Emails enviados automaticamente
| Gatilho | Assunto | Conteúdo |
|---|---|---|
| Pedido criado | "Pedido #X recebido 🎉" | Confirmação com resumo de itens e total |
| Status → confirmado | "Pedido #X confirmado 👨‍🍳" | "Está a ser preparado, entrega das 14h–18h" |
| Status → a caminho | "O seu pedido está a caminho! 🛵" | "Saiu da loja, em rota para a sua morada" |
| Status → entregue | "Como foi? Deixe a sua avaliação ⭐" | CTA para review.html + barra de fidelidade |
| Status → cancelado | "Pedido #X cancelado" | Lamentamos + link WhatsApp |

> Todos os emails têm design HTML branded (brown/gold), responsivos, com rodapé da loja.  
> Se SMTP não configurado: emails são simplesmente ignorados, o resto funciona normalmente.

---

## Sistema de Avaliações e Fidelidade

### Fluxo completo
1. Cliente faz encomenda e fornece email (campo opcional no passo 2)
2. Ao marcar pedido como **entregue**, o servidor envia email com link único `SITE_URL/review/TOKEN`
3. O cliente abre a página → vê o seu nome e número do pedido → selecciona 1–5 estrelas → escreve comentário
4. A avaliação é guardada na tabela `reviews`
5. O servidor conta avaliações por email → devolve `loyalty_count` e `is_reward`
6. Ao atingir **5 avaliações** → banner dourado na página: "Molho Extra GRÁTIS no próximo pedido!"

### Segurança
- O link de avaliação só funciona se o pedido tiver email associado
- Só é possível avaliar uma vez por pedido (token é de uso único)
- A página `review.html` sem token válido mostra mensagem de erro
- Nenhum dado sensível (email, morada) é exposto pela rota pública `/api/review/:token`

---

## Site Público (index.html)

### Secções
1. **Barra de anúncio** — "Delivery hoje das 14h às 18h · Encomendar agora →" (com botão de fechar)
2. **Nav** — logo animado (aparece ao fazer scroll), links, botão "Encomendar"
3. **Hero** — logo grande, headline, CTA, indicador aberto/fechado em tempo real, countdown até às 13h30, estatísticas animadas (2020, 841 fãs, 100%)
4. **Marquee** — faixa animada com nomes dos produtos
5. **Menu** — Churros Espanhóis (grid editorial), Recheados, Vitrine Gourmet
6. **Delivery** — horários, localização, WhatsApp
7. **Encomendas** — formulário de pedido (3 passos)
8. **Eventos** — informação + formulário de solicitação
9. **Footer** — links, horários, endereço, botão oculto para dashboard

### Formulário de Encomenda — Detalhe

**Passo 1 — Produtos**
- 5 produtos: Espanhóis 4un (250MT), 6un (320MT), 12un (580MT), Recheados 4un (600MT), 6un (900MT)
- Cada unidade tem o seu próprio selector de molho (Doce de Leite / Nutella)
- Extras & Coberturas: Castanhas, Pistachio, Marshmallow, Smarties, Granulado, Coco Ralado, Molho Extra — cada um +100 MT

**Passo 2 — Entrega**
| Zona | Taxa |
|---|---|
| Dentro da cidade | 100 MT |
| Baixa | 120 MT |
| Marés / Costa do Sol | 150 MT (antes 16h) / 200 MT (após 16h, automático) |
| Malha Galene | 150 MT |
| Recolha via Yango (cliente) | 0 MT |

- Campos: nome, telefone, **email (opcional — para receber confirmação e link de avaliação)**, morada, observações

**Passo 3 — Confirmar**
- Resumo completo + botão "Enviar para WhatsApp"

**Passo 4 — Enviado**
- Check animado + botão "Abrir WhatsApp" + botão "Fazer Novo Pedido"

### Funcionalidades JS do Site
- **Cursor personalizado** — dot dourado + ring amber
- **Scroll reveal** — secções animam ao entrar no viewport (`.r` e `.reveal`)
- **Contadores animados** — stats do hero contam de 0 até ao número (easing cubic)
- **Countdown** — conta decrescentemente até às 13h30; desaparece após esse horário
- **Indicador aberto/fechado** — verde (aberto + delivery), âmbar (aberto sem delivery), vermelho (fechado)
- **Funil de analytics** — eventos enviados silenciosamente ao `/api/analytics`
- **Botão WhatsApp flutuante** — fixo no canto inferior direito (pulse animation)

### Schema JSON-LD (SEO)
- Tipo: `FoodEstablishment`
- Campos: name, description, url, telephone, image, address, openingHoursSpecification, servesCuisine, priceRange

---

## Painel de Administração (dashboard.html)

### Acesso
- URL: `/dashboard`
- Autenticação: POST `/api/auth` com DASHBOARD_PASSWORD → token Bearer em todas as rotas protegidas
- Botão de acesso: ícone de cadeado no rodapé do site

### Funcionalidades
- **Stats** — 5 cards: Total Pedidos, Pendentes, Receita Total, Eventos, banner "Hoje" (pedidos + receita do dia)
- **Tab Delivery** — tabela desktop + cards mobile
  - Status: pendente → confirmado → **a caminho** → entregue / cancelado (badge roxo para "a caminho")
  - Pop-up de confirmação ao mudar status: mostra ícone + nome do cliente + se email foi enviado
  - Modal de detalhe completo: itens, extras, molhos, morada, notas
  - Botão WhatsApp directo por pedido
- **Tab Eventos** — tabela desktop + cards mobile
- **Tab Funil** — visualização de conversão em barras: Visita → Menu → Encomenda → P1 → P2 → WhatsApp
  - Cards resumo: total visitas, taxa de conversão %, WhatsApp hoje
  - Bolhas coloridas por passo, drop-off como pill badge entre passos
- **Tab Faturamento** — dashboard de receita com:
  - Seletor de período: Diário (30 dias) / Mensal (12 meses) / Anual
  - KPIs: Receita do período, Pedidos, Ticket médio
  - Gráfico de barras SVG com animação de entrada
  - Top Zonas de Entrega — ranking com barras e 🥇🥈🥉
  - Top Clientes — ranking com avatar/medalha, pedidos e receita; seletor Este mês / Sempre
- **Tab Avaliações** — lista de todas as reviews com estrelas, comentário, nome do cliente, tempo relativo
- **Polling** — verifica novos pedidos pendentes a cada 30s; som + toast se houver novos

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

### Completo ✅
- [x] **Botão WhatsApp flutuante** — fixo no canto inferior direito (pulse animation)
- [x] **Polling de novos pedidos no dashboard** — verifica a cada 30s, som + toast
- [x] **Segurança do dashboard** — token Bearer em todas as rotas protegidas
- [x] **Indicador aberto/fechado** — em tempo real no hero
- [x] **Meta tags Open Graph** — pré-visualização ao partilhar no WhatsApp
- [x] **Ver detalhes completos do pedido** — modal com todos os itens, extras, molhos, notas
- [x] **Estatísticas do dia** — banner "Hoje" no dashboard (pedidos + receita)
- [x] **Schema JSON-LD** — card de negócio no Google (FoodEstablishment)
- [x] **Funil de conversão no dashboard** — analytics com barras de conversão e drop-off
- [x] **Barra de anúncio** — faixa no topo com CTA para encomenda
- [x] **Countdown até às 13h30** — timer no hero com urgência real
- [x] **Animações de scroll** — reveal suave ao fazer scroll (IntersectionObserver)
- [x] **Contadores animados** — stats do hero contam de 0 até ao número
- [x] **Status "a caminho"** — novo estado de entrega com badge roxo
- [x] **Sistema de emails transaccionais** — confirmação, estado, avaliação (Nodemailer)
- [x] **Página de avaliação** — `review.html` acessível só por token único por email
- [x] **Programa de fidelidade** — após 5 avaliações → molho extra grátis
- [x] **Pop-up "pedido saiu da loja"** — modal no dashboard ao mudar para "a caminho"
- [x] **Tab Avaliações no dashboard** — lista todas as reviews com estrelas e comentários
- [x] **Preloader** — ecrã de entrada com logo animado e barra de progresso
- [x] **3D Tilt nos cards do menu** — hover com rotação 3D em perspectiva
- [x] **Social proof toast** — notificações "Fátima de Polana encomendou há X min"
- [x] **Modal de produto** — clique em qualquer card do menu abre lightbox com foto, ingredientes, badges Vegetariano + Halal, preços e CTA
- [x] **Dashboard de Faturamento** — gráfico de barras SVG Diário/Mensal/Anual, Top Zonas, Top Clientes (mês ou sempre)

### Próximas (por prioridade)
- [ ] **Filtro por status e data** no dashboard — filtrar pedidos sem reload
- [ ] **Pesquisa por nome/telefone** — campo de busca em tempo real na tabela
- [ ] **Exportar CSV** — lista de pedidos do dia para o estafeta
- [ ] **Gráfico dos últimos 7 dias** — sparkline de receita por dia (SVG puro)
- [ ] **Modo promoção** — switch no dashboard activa banner no site público
- [ ] **Google Maps** no footer

### Menor prioridade
- [ ] **Produto mais vendido** — estatística no dashboard
- [ ] **Zona mais popular** — % de pedidos por zona
- [ ] **Rastreamento de pedido para o cliente** — link `SITE_URL/pedido/42` com status em tempo real
- [ ] **Notificações push web** — cliente subscreve, recebe push às 14h quando delivery abre
- [ ] **Pre-encomenda para o dia seguinte** — formulário muda depois das 13h30
- [ ] **Rate limiting** na API
- [ ] **Validação no backend** — campos obrigatórios verificados no servidor

---

## Variáveis de Ambiente (Railway)

```
DATABASE_URL=postgresql://...        ← gerado automaticamente pelo plugin PostgreSQL
NODE_ENV=production
PORT=3000                            ← opcional, Railway define automaticamente
DASHBOARD_PASSWORD=churros2025       ← senha do dashboard admin
SMTP_HOST=smtp.gmail.com             ← servidor SMTP para emails
SMTP_PORT=587
SMTP_USER=holachurros@gmail.com      ← conta Gmail usada para enviar
SMTP_PASS=[App Password Gmail]       ← Conta Google → Segurança → Senhas de app
SMTP_FROM=holachurros@gmail.com      ← opcional
SITE_URL=https://holachurrosmz.up.railway.app  ← usado nos links dos emails
```

---

## Contactos & Referências
- WhatsApp da loja: +258 85 269 0365
- Instagram: @holachurrosmz
- Endereço: Av. Amílcar Cabral, 856, Maputo
- Horário loja: Seg–Sex 09:30–18:30
- Horário delivery: 14:00–18:00
- Encomendas até: 13:30 (para receber no mesmo dia)
