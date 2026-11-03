# Segurança e operação

## Demonstração local

Servidor escuta apenas 127.0.0.1. Senhas têm salt aleatório e scrypt; cookie contém token aleatório e o banco só guarda seu hash. Sessão absoluta de uma hora, token CSRF e verificação de origem em mutações; logout, ativação e recuperação revogam sessões. Cookie HttpOnly e SameSite Strict; sem Secure apenas porque a prévia é HTTP local. Produção está bloqueada explicitamente.

Há rate limits por IP/identidade em SQLite, limite de corpo, validação de campos, SQL parametrizado, escape de HTML e CSP. Logs HTTP não registram corpos, credenciais ou documentos; auditoria registra ator/evento/recurso/data. Não interpretar esses controles locais como auditoria independente ou homologação para produção.

API valida papel e propriedade em cada recurso. URLs de cobrança/documento são identificadores internos e não concedem acesso por si. Não existem endpoints para emitir, cancelar ou alterar boleto/contrato nem mudar planos automaticamente. Não há cadastro público nem delegação de papéis pelo cliente.

## Primeiro acesso real proposto

Equipe confere titularidade e contato por procedimento aprovado, cadastra cliente, confirma cadastro SIPROV para boletos, vincula identidade Supabase e só então envia convite único ao contato verificado. Casos sem contato confiável ou pessoas jurídicas com representantes vão para validação humana. Não usar placa/documento como segredo e não permitir que usuário escolha o cadastro alvo.

Em Supabase, usar Auth como fonte de identidade, bloquear signup público, validar JWT no backend, guardar sessão com cookies seguros e renovar/revogar corretamente. Não confiar em user_metadata editável para papéis/vínculos. Somente operação privilegiada cria membership, com auditoria e MFA de funcionários. Políticas SQL propostas são leitura restrita e backend para mutações. Testar também acesso direto pelo endpoint Supabase com anon/authenticated para comprovar RLS.

## Antes de uso com dados reais

- Substituir SQLite/caixa local/mock por Supabase Auth, Postgres, SMTP e adapters reais homologados; remover contas de demonstração e seletor de cenários.
- TLS, Secure/HttpOnly/SameSite, origem exata e allowlist de redirecionamentos. Configurar proxy sem confiar cegamente em X-Forwarded-For; rate limit distribuído e proteção contra abuso de email.
- Habilitar MFA da equipe, revisão de permissões, revogação de usuários, inatividade/expiração e trilha de ações administrativas. Confirmar papéis definitivos com empresa.
- Segredos no gerenciador da hospedagem; rotação e acesso mínimo. Não incluir payloads pessoais, JWT ou URLs de assinatura em logs/telemetria.
- Webhooks em HTTPS, segredo exclusivo, comparação constante, tamanho/esquema/eventos, deduplicação semântica, fila durável e reconciliação na API. Não presumir autenticidade sem header validado.
- Testes de penetração proporcionais, testes RLS e isolamento de todos os recursos antes de migrar dados. Aplicação atual não passou pentest e o SQL ainda não foi executado.

## Dados, retenção e backups

Guardar apenas cadastros necessários, memberships, protocolos, histórico e IDs de vínculo. Não copiar documentos nem ledger financeiro; boletos/status têm origem SIPROV e contratos/status ZapSign. CPF/CNPJ completos não foram adicionados aos exemplos por não serem necessários à navegação.

Definir com a empresa prazos por categoria, obrigações de guarda, finalidade, controles de acesso, correções/exclusões e retenção de backups. Não apagar automaticamente cadastros/auditoria antes dessa definição. A entrega não contém política jurídica de LGPD pronta.

Local: o banco WAL fica em data/ e contém apenas dados fictícios; parar o servidor e copiar a pasta data inteira para um local protegido para backup consistente, ou usar SQLite backup API. Não copiar somente portal.sqlite enquanto o servidor escreve. A caixa local contém links de acesso e deve ter acesso restrito e ser removida segundo a rotina de testes autorizada.

Supabase futuro: selecionar backup/PITR compatível com o plano, criptografia e região adequadas, acesso mínimo e restore periódico em ambiente isolado. Definir RPO/RTO, proprietário operacional e procedimento de incidentes. Validar restauração e exclusão inclusive de backups conforme regras aprovadas.
