# Boa Terra

Sistema de gestão para corretora de grãos. Controla clientes produtores e compradores, contratos de compra e venda de sacas com comissão, motoristas e carregamentos, e a movimentação financeira associada.

## Stack

Backend em Express com Prisma sobre PostgreSQL, autenticação por JWT e validação com Zod. Frontend em Next.js 15 com App Router e React 19, estilizado com Tailwind, usando NextAuth para sessão e jsPDF para gerar o contrato em PDF no cliente.

## Rodando

```bash
cp .env .env.local   # não existe .env.example; use o .env versionado como referência
docker compose up -d --build
```

Frontend em `http://localhost:8093` e backend em `http://localhost:8094`.

O compose não sobe banco — o PostgreSQL precisa ser externo, apontado por `DATABASE_URL`. Existe um `docker-compose.override.yml` de desenvolvimento (fora do versionamento) que adiciona um nginx local e permite acessar tudo por `http://localhost`.

### Variáveis

`DATABASE_URL`, `NEXTAUTH_SECRET` (mínimo de 32 caracteres), `NEXTAUTH_URL` e `CORS_ORIGINS`. Os containers recebem ainda `NEXT_PUBLIC_API_URL` e `BACKEND_INTERNAL_URL`.

## Módulos

**Clientes** — produtores e compradores. Escrita restrita a administradores.

**Contratos** — compra e venda de sacas com comissão, incluindo geração do contrato em PDF por `GET /api/contratos/:id/pdf`.

**Carregamentos** — registro das cargas vinculadas aos contratos. Criação e edição liberadas para o perfil operacional, exclusão apenas para administradores.

**Motoristas** — cadastro usado nos carregamentos.

**Transações** — movimentação financeira com anexos. Os arquivos são servidos por rota autenticada, não por diretório público.

**Dashboard** — consolidação dos números.

A API fica sob `/api` e há um `GET /health` para healthcheck. O controle de acesso usa três perfis: `admin`, `operacional` e `readonly`.

## Deploy

O repositório suporta dois caminhos independentes.

**Vercel** — o `vercel.json` faz dois builds no mesmo repositório: o Next.js pelo `@vercel/next` e o Express inteiro como serverless function pelo `@vercel/node`, com `backend/api/index.ts` apenas reexportando o app. As rewrites mandam `/api/*` para a função e o resto para o frontend.

**VPS com Docker e nginx** — a pasta `nginx/` tem dois arquivos. O `local.conf` é usado pelo container nginx em desenvolvimento e resolve os upstreams por nome de serviço. O `default.conf` é referência para o nginx do host: copie para `/etc/nginx/sites-available/` e crie o symlink em `sites-enabled`.

Em ambos, a ordem de roteamento importa: `/api/auth/` vai para o Next.js, porque quem cuida de login e sessão é o NextAuth; só depois `/api/` cai no Express. O `/health` vai para o backend e o restante para o frontend.

Um detalhe a corrigir antes de usar o `default.conf`: ele assume os containers publicados em 3001 e 3002 no loopback, mas o `docker-compose.yml` publica em 8093 e 8094. Ajuste as portas ou o compose.

## Notas

Não existe `.env.example` — há um `.env` versionado com placeholders servindo de referência. O rate limit está em 300 requisições por 15 minutos em `/api/` e 20 por 15 minutos em `/api/auth`.
