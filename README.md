# GTBLOCK · Portal do cliente

Projeto independente da landing page, com duas formas de execução: servidor local com autenticação/SQLite e demonstração estática preparada para Vercel. Nenhum arquivo de `SITE GTBLOCK` foi alterado e nenhum sistema real foi acessado com credenciais.

## Apresentação na Vercel

`npm run build` gera `dist/` com uma demonstração navegável que funciona sem backend, Supabase ou segredos. `npm run preview` abre o servidor de conferência na porta 4320. **Nesta apresentação o login e as solicitações são simulados e ficam apenas na aba do visitante. Não inserir dados reais.**

O arquivo `vercel.json` já define a saída correta. Configuração da Vercel e limites da apresentação: [docs/VERCEL.md](docs/VERCEL.md). A versão original descrita abaixo continua funcionando localmente com `npm run dev`.

## Iniciar

Requer Node.js 24 ou superior. Sem dependências de terceiros ou instalação de pacotes.

```powershell
cd 'C:\Users\ozana\OneDrive\Desktop\SISTEMA CLIENTES GTBLOCK\portal'
Copy-Item .env.example .env
npm run seed
npm run dev
```

Abrir http://127.0.0.1:4310. Use exatamente esse host, pois a origem das requisições é verificada. Não abrir `index.html` diretamente. `npm start` também inicia a versão local. Parar com Ctrl+C.

## Contas de demonstração

Senha comum **somente dos exemplos locais**: `Demo!GTBlock2026`.

| Conta | Papel |
| --- | --- |
| ana@demo.gtblock.local | Cliente Ana |
| bruno@demo.gtblock.local | Cliente Bruno, dados isolados |
| equipe@demo.gtblock.local | Atendimento |
| admin@demo.gtblock.local | Administração e consulta de auditoria |

O seed é idempotente e não redefine senhas existentes. Credenciais fictícias aparecem também na tela de login. A aplicação e o seed recusam produção; não reutilizar essas contas fora do desenvolvimento.

## O que funciona nesta etapa

- Autenticação real **local** com senha derivada por scrypt, sessão opaca de uma hora, cookie HttpOnly/SameSite Strict, logout e revogação no servidor.
- Dados isolados por cliente em todas as consultas e URLs de recursos. Papéis client/support/admin validados no servidor.
- Recuperação e convite com tokens aleatórios, hash no banco, validade de 30 minutos e uso único. Mudança de senha invalida sessões anteriores.
- Painel, financeiro filtrável, exemplos de contratos, assinatura, veículos, perfil, central e atalho Getrak.
- Chamados persistidos em SQLite, protocolo único, idempotência de criação, estado, responsável e histórico. Equipe pode responder; cliente acompanha.
- Troca de plano é apenas sinalização para comercial. Cancelamento também permanece pedido de análise, sem modificar contrato/cobrança.
- Estados de carregamento, vazio, erro e indisponibilidade. Seletor de cenários visível e restrito à demonstração.
- Central confirmada pelo usuário: **0800 400 0190** e **0800 400 0911**, com links para telefone. Rastreamento: https://sis.getrak.com/gtblock/.
- Layout adaptado a telas pequenas; navegação por teclado, foco visível, labels, dialog nativo, feedback e movimento reduzido.

## Simulado ou pendente

- SIPROV e ZapSign não estão conectados. Plano, benefícios, veículos, cobranças e contratos são exemplos isolados em `server/integrations.mjs`.
- Não há boleto real, linha digitável, Pix, download de contrato nem link de assinatura. Os exemplos não podem ser pagos/assinados. Não gerar códigos fictícios que pareçam pagáveis.
- Email não é enviado: recuperação/convites vão para `data/dev-mailbox.jsonl`, arquivo local sensível ignorado pelo Git. Não mostrar esse arquivo em logs nem compartilhá-lo.
- Supabase é o banco escolhido para a operação real; **a aplicação atual ainda usa SQLite**, e `docs/supabase.sql` é uma proposta de migração não aplicada nem validada em Postgres.
- Cadastro real, convite e vínculo de clientes precisam de fluxo administrativo homologado. Não há autorregistro aberto ou associação automática por CPF/placa.
- Regras finas da equipe, MFA de funcionários, SLA, edição direta do perfil e políticas de dados aguardam definição.
- Webhook ZapSign tem autenticação por segredo próprio e deduplicação, mas apenas registra digest para reconciliação futura; não sincroniza documentos.
- A troca de plano aparece na fila interna para encaminhamento ao comercial; notificações externas não são enviadas.

## Arquitetura e próximas etapas

**Atual/local:** HTML/CSS/JS modular → API Node HTTP → SQLite (usuários, vínculos, sessões, protocolos, histórico, auditoria). Integrações mock só no backend. Sem caches financeiros ou cópias de documentos no banco.

**Alvo confirmado:** frontend → backend/BFF → Supabase Auth + Postgres (clientes, veículos, planos, vínculos e solicitações); backend → SIPROV **somente boletos**; backend → ZapSign **consulta de documentos e links autorizados**. Use um único cadastro do portal como origem para plano e veículos. Não sincronizar esses cadastros automaticamente com SIPROV.

1. **Etapa 1: entregue localmente.** Navegação, identidade, autenticação local, protocolos e painel interno com dados fictícios.
2. **Etapa 2: Supabase em homologação.** Configurar projeto, Auth/SMTP, convite ao contato já verificado, cadastro/vínculo conferido por funcionário, tabelas/RLS, adaptar repositórios e sessões à identidade Supabase. Não migrar hashes de demonstração nem ativar autorregistro. Testar políticas no banco antes de usar dados pessoais. Chave secreta somente no backend.
3. **Etapa 3: integrações somente leitura.** Confirmar permissões/custos/contratos, mapear identificador SIPROV, validar filtros por titular; importar associação de contratos antigos para revisão manual antes de liberar. Conectar consulta de boletos e ZapSign, webhooks/fila, reconciliação e tratamento de erros reais.
4. **Etapa 4: homologação operacional.** Testar clientes distintos e contas empresariais, funcionários/escalações, recuperação, MFA, falhas, restore de backup e acessibilidade. Definir regras contratuais e dados com a empresa.
5. **Etapa 5: publicação somente após autorização.** Hospedagem/domínio serão escolhidos depois; `cliente.gtblock.com.br` é sugestão. Habilitar HTTPS, cookie Secure, origem exata, secret manager, rate limit distribuído, observabilidade e backups. Não publicar esta versão de demonstração como produção.

## Configuração segura

Veja `.env.example`. `HOST`, `PORT`, `APP_ORIGIN`, `DATA_DIR`, `NODE_ENV`, `INTEGRATION_MODE` são usados localmente. `SUPPORT_WHATSAPP` só deve receber canal administrativo confirmado. Campos Supabase/SIPROV/ZapSign são placeholders para a etapa seguinte; preenchê-los **não habilita a integração**. `INTEGRATION_MODE=live` falha com indisponibilidade, sem retornar mock como dado real.

Tokens de provedores nunca são pedidos no chat. Na homologação, o responsável configurará diretamente o gerenciador de segredos da hospedagem ou arquivo local `.env` ignorado pelo Git. Não incluir segredos em URLs, histórico do shell, capturas ou logs. Não usar service_role/secret key no frontend.

As fontes do Google são externas e podem cair para fontes locais sans-serif; para produção, considerar hospedá-las no próprio projeto.

## Primeiro acesso e recuperação

Operador confere cadastro, titularidade e contato previamente registrado; associa explicitamente usuário e cliente. Só então emite convite. Não revelar dados ao informar CPF, CNPJ ou placa. Email de um contrato é pista para conciliação, nunca autorização suficiente sozinho.

Para testar convite de uma conta fictícia já cadastrada:

```powershell
npm run invite -- ana@demo.gtblock.local
```

Leia a caixa local em seu editor e abra o link. Não envie esse arquivo ao GitHub. A tela de recuperação produz a mesma resposta para email existente e inexistente. Na produção, substituir transporte local por email verificado (Supabase Auth + SMTP), validar redirecionamentos e adicionar MFA para equipe. Ver detalhes em `docs/SEGURANCA.md`.

## Testes

```powershell
npm run check
npm test
```

Testes usam diretório temporário e porta 4319, sem modificar o banco local da prévia. Cobrem autorização, propriedade de recursos, CSRF, origem, protocolo/idempotência, histórico, cookies, recuperação, logout, rate limit e webhooks. Resultados e validação visual em `docs/VALIDACAO.md`.

## Referências e decisões

Identidade copiada apenas dos três arquivos webp em `public/brand` da landing local. Cores `#121210`, `#1b1c18`, `#dfc07b`; fontes Montserrat/Space Grotesk. Instagram: @gtblockcomercial.

Documentação oficial e limites da pesquisa: `docs/INTEGRACOES.md`. Pendências da empresa e de infraestrutura: `docs/DECISOES.md`. Envio do código ao GitHub autorizado pelo usuário; a publicação da demonstração e as conexões a sistemas reais são etapas separadas.
