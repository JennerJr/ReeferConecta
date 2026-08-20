# ReeferConecta

Sistema de cadastro de peças para indústria de refrigeração industrial.

## Tecnologias

- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Backend:** Fastify + TypeScript + Zod (em desenvolvimento)

## Frontend

O frontend está funcional e pronto para uso.

### Rodando o frontend

```bash
cd frontend/reeferconecta
npm install
npm run dev
```

Acesse `http://localhost:3000`

### Funcionalidades

- **Listagem de peças** — tabela com nome, serial number, fabricante, terminal, técnico, QC, situação
- **Cadastro de peças** — formulário com todos os campos essenciais
- **Fallback local** — salva peças em `data/pecas.json` quando o Google Sheets não está configurado

## Estrutura do frontend

```
frontend/reeferconecta/
├── app/
│   ├── api/
│   │   └── pecas/
│   │       └── route.ts       (API: GET e POST de peças, fallback local)
│   ├── pecas/
│   │   └── page.tsx          (Página de listagem e cadastro)
│   ├── layout.tsx
│   └── page.tsx
├── data/
│   └── pecas.json            (Dados locais — fallback)
├── next.config.js
├── tailwind.config.js
└── package.json
```

## Backend (em desenvolvimento)

O backend está em fase de desenvolvimento. Não está incluído neste repositório.

## Autor

Jenner José Teixeira Junior — RefriTudo e RefriCentral

## Status

MVP funcionando. Frontend: online. Backend: em desenvolvimento.
