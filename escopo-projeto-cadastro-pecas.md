# Sistema de Cadastro de Peças — Escopo do Projeto

## 1. Visão Geral

Sistema web responsivo (PWA) para cadastro, visualização e edição de peças, utilizável tanto em computador quanto em celular a partir de uma única base de código. Os dados são armazenados em MongoDB através de uma API própria.

## 2. Funcionalidades

- Cadastrar nova peça
- Listar peças cadastradas (com busca/filtro)
- Visualizar detalhes de uma peça
- Editar informações de uma peça existente
- (Opcional a definir) Remover peça / arquivar peça

### Campos da Peça

| Campo | Descrição |
|---|---|
| Nome | Nome da peça |
| Serial Number | Identificador único de fábrica |
| Fabricante | Empresa fabricante |
| Terminal | Terminal associado |
| Técnico Responsável | Quem está responsável pela peça |
| Part Number | Código da peça do fabricante |
| QC | ID interno de controle |
| Data de Chegada | Quando a peça chegou |
| Situação Atual | Status atual da peça |

> Serial Number e QC devem ser únicos no banco de dados.

## 3. Stack Escolhida

### Frontend
- **Next.js** (React + TypeScript)
- **Tailwind CSS** — estilização utilitária e responsiva
- **PWA** (via `next-pwa`) — permite instalar o sistema como app no celular e no desktop, sem loja de aplicativos

### Backend
- **Fastify** (Node.js + TypeScript) — servidor da API
- **Mongoose** — modelagem e validação de schema no MongoDB
- **Zod** — validação dos dados recebidos nas rotas da API
- **MongoDB** — banco de dados

### Fluxo de Comunicação

```
[Frontend Next.js / PWA]
        ↓ HTTP (fetch/JSON)
[API Fastify]
        ↓ Zod (valida entrada)
        ↓ Mongoose (valida/persiste)
[MongoDB]
```

## 4. Estrutura de Pastas (sugestão)

**Backend**
```
backend/
  src/
    models/
      Peca.model.ts
    schemas/
      peca.schema.ts
    routes/
      pecas.routes.ts
    server.ts
  package.json
  tsconfig.json
```

**Frontend**
```
frontend/
  app/
    page.tsx              (listagem)
    pecas/
      novo/page.tsx        (cadastro)
      [id]/page.tsx         (detalhes/edição)
  public/
    manifest.json
  next.config.js
  tailwind.config.js
  package.json
```

## 5. Rotas da API

| Método | Rota | Descrição |
|---|---|---|
| POST | `/pecas` | Cadastrar nova peça |
| GET | `/pecas` | Listar peças (com filtros via query params) |
| GET | `/pecas/:id` | Buscar peça específica |
| PUT | `/pecas/:id` | Atualizar peça |
| DELETE | `/pecas/:id` | Remover peça |

## 6. Passos de Construção

### Etapa 1 — Preparação do ambiente
- [ ] Instalar Node.js (LTS)
- [ ] Criar conta/instância MongoDB (local via Docker ou MongoDB Atlas na nuvem)
- [ ] Criar repositório do projeto (ex: monorepo com `backend/` e `frontend/`, ou dois repositórios separados)

### Etapa 2 — Backend (API)
- [ ] Inicializar projeto Node.js + TypeScript
- [ ] Instalar Fastify, Mongoose, Zod e dependências auxiliares
- [ ] Configurar conexão com MongoDB via Mongoose
- [ ] Criar o Schema/Model da Peça
- [ ] Criar os schemas de validação Zod (criação e edição)
- [ ] Implementar rota de cadastro (POST)
- [ ] Implementar rota de listagem (GET, com busca/filtro)
- [ ] Implementar rota de detalhes (GET por id)
- [ ] Implementar rota de edição (PUT)
- [ ] Implementar rota de remoção (DELETE), se aplicável
- [ ] Testar rotas (Insomnia, Postman ou Thunder Client)
- [ ] Tratar erros e mensagens de validação

### Etapa 3 — Frontend (Next.js)
- [ ] Inicializar projeto Next.js + TypeScript
- [ ] Configurar Tailwind CSS
- [ ] Criar layout base (cabeçalho, navegação simples)
- [ ] Criar tela de listagem de peças
- [ ] Criar tela/formulário de cadastro
- [ ] Criar tela de detalhes/edição
- [ ] Conectar telas à API (fetch das rotas)
- [ ] Adicionar validações no formulário (feedback visual de erro)
- [ ] Ajustar responsividade (mobile e desktop)

### Etapa 4 — Transformar em PWA
- [ ] Instalar e configurar `next-pwa`
- [ ] Criar `manifest.json` (nome, ícones, cores do app)
- [ ] Gerar ícones em diferentes tamanhos
- [ ] Testar instalação no celular ("Adicionar à tela inicial")
- [ ] Testar instalação no desktop (Chrome/Edge)

### Etapa 5 — Testes e Ajustes
- [ ] Testar fluxo completo: cadastro → listagem → edição
- [ ] Validar regras de unicidade (Serial Number, QC)
- [ ] Testar em diferentes tamanhos de tela
- [ ] Revisar mensagens de erro e usabilidade

### Etapa 6 — Deploy
- [ ] Definir hospedagem do backend (ex: Railway, Render, VPS)
- [ ] Definir hospedagem do frontend (ex: Vercel)
- [ ] Configurar variáveis de ambiente (string de conexão MongoDB, URLs da API)
- [ ] Configurar domínio/HTTPS (necessário para PWA funcionar corretamente)
- [ ] Testar em produção

## 7. Pontos em Aberto (a decidir)

- Vai haver autenticação/login de usuários (técnicos)?
- Peças removidas devem ser deletadas ou apenas marcadas como inativas (soft delete)?
- Precisa de histórico de alterações por peça (log de mudanças)?
- Lista fixa de opções para "Situação Atual" (ex: dropdown) ou texto livre?
- Upload de imagem/foto da peça será necessário no futuro?
