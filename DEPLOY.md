# Deploy na Railway

## 1. Instalar dependências localmente (para testar)
```
npm install
node server.js
```
Abrir: http://localhost:3000
Dashboard: http://localhost:3000/dashboard  (senha: churros2025)

## 2. Criar conta na Railway
- Aceder a railway.app
- Criar conta com GitHub

## 3. Deploy

### Opção A — Via GitHub (recomendado)
1. Criar repositório no GitHub com todos os ficheiros
2. Na Railway: New Project → Deploy from GitHub repo
3. Seleccionar o repositório

### Opção B — Via CLI
```
npm install -g @railway/cli
railway login
railway init
railway up
```

## 4. Adicionar PostgreSQL na Railway
1. No projecto Railway → New Service → Database → PostgreSQL
2. A variável DATABASE_URL é adicionada automaticamente

## 5. Variáveis de ambiente na Railway
Ir a Settings → Variables e adicionar:
```
NODE_ENV=production
DASHBOARD_PASSWORD=SUA_SENHA_SEGURA
```
(DATABASE_URL é configurado automaticamente pelo plugin PostgreSQL)

## 6. Domínio
Settings → Domains → Generate Domain
O site ficará disponível em: https://hola-churros-xxx.railway.app

## Estrutura de ficheiros necessários
```
hola-churros/
├── server.js
├── package.json
├── railway.toml
├── .gitignore
└── public/
    ├── index.html       ← site público
    ├── dashboard.html   ← painel admin
    └── uploads/
        └── Hola Churros Logo.png
```

## Alterar senha do dashboard
No ficheiro dashboard.html, linha:
  const PASS = 'churros2025';
Alterar para a senha desejada e fazer novo deploy.
