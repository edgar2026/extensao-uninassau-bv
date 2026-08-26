# Gestão de Extensão Acadêmica

Plataforma profissional e escalável para gerenciamento de projetos de extensão acadêmica, controle de alunos, docentes, homologação de relatórios, emissão de certificados digitais e validação pública.

---

## Funcionalidades Principais

- **Dashboard Unificado:** Métricas consolidadas para Alunos, Professores e Administradores.
- **Projetos de Extensão:** Cadastro completo e fluxo de aprovação de projetos acadêmicos e ICs.
- **Vínculo de Discentes:** Vinculação manual ou importação em massa de alunos via Edge Functions.
- **Certificação Digital:** Emissão automatizada de certificados eletrônicos com assinatura institucional.
- **Validação Pública:** Portal aberto para validação de certificados por código de autenticação ou UUID.
- **Painel de Auditoria:** Rastreabilidade detalhada de todas as ações dos usuários.

---

## Tecnologias

- **Frontend:** React 19 + TypeScript + Vite
- **Estilização:** Tailwind CSS v4
- **Roteamento & Formulários:** React Router DOM v7 + React Hook Form + Zod
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions, RLS)

---

## Instalação e Execução Local

### Pré-requisitos

- Node.js 18+ instalado
- npm ou gerenciador de pacotes equivalente

### Passos

1. Instalar dependências:
   ```bash
   npm install
   ```

2. Configurar variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```
   Preencha o `.env` com as credenciais do seu projeto Supabase.

3. Iniciar servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

4. Build para produção:
   ```bash
   npm run build
   ```

5. Preview do build local:
   ```bash
   npm run preview
   ```

6. Checagem de tipos:
   ```bash
   npm run lint
   ```

---

## Deploy na Vercel

### Variáveis de Ambiente (na Vercel)

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase (ex: `https://xxx.supabase.co`) | Sim |
| `VITE_SUPABASE_ANON_KEY` | Chave pública (anon) do Supabase | Sim |
| `VITE_APP_TITLE` | Título da aplicação | Não |
| `VITE_SITE_URL` | URL de produção (ex: `https://seu-dominio.vercel.app`) | Não |

> **IMPORTANTE:** Nunca configure `SUPABASE_SERVICE_ROLE_KEY` no frontend. Esta chave só existe no ambiente seguro das Edge Functions.

### Configuração no Supabase Auth

No painel do Supabase, em **Authentication > URL Configuration**, adicione:

- **Site URL:** `https://seu-dominio.vercel.app`
- **Redirect URLs:**
  - `https://seu-dominio.vercel.app/criar-senha`
  - `https://seu-dominio.vercel.app/redefinir-senha`

### Edge Functions e Migrations

Edge Functions (`supabase/functions/`) e migrations (`supabase/migrations/`) são implantadas diretamente no Supabase, **não na Vercel**.

Para fazer deploy das Edge Functions:
```bash
supabase functions deploy admin-delete-user
supabase functions deploy create-managed-user
supabase functions deploy import-students-batch
```

---

## Estrutura do Projeto

```
src/
├── app/              Layouts e router
├── components/ui/    Componentes reutilizáveis
├── contexts/         AuthContext
├── features/         Módulos (auth, certificados, dashboard, projetos, usuarios, validacao)
├── lib/              Supabase client, storage, errors
├── services/         Services e repositories
└── types/            Definições TypeScript
```

---

## Licença

Apache-2.0
