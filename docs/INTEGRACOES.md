# Integrações: pesquisa e contratos futuros

Consulta oficial em 02/11/2026 (fuso de São Paulo). Nenhuma chamada autenticada ou alteração em fornecedor.

## SIPROV — somente boletos

Referências:
- https://doc.siprov.com.br/
- https://doc.siprov.com.br/referencia-da-api/introducao-tecnica/financeiro/titulo/boleto
- OpenAPI apontado pelo fornecedor: https://acesso.siprov.com.br/siprov-api/openapi.json

A página de boleto publica GET `/ext/financeiro/titulo/boleto`, GET `/ext/financeiro/titulo/{codTitulo}/boleto` e POST nessa última rota. Não usar POST: a etapa autorizada é consulta, não emissão. A existência da rota não prova acesso na conta GTBLOCK nem que o GET produza todos os campos desejados. O conteúdo completo do OpenAPI não pôde ser recuperado na pesquisa; autenticação, parâmetros de filtro, paginação, semântica/efeitos dos GETs, estados e limites precisam de homologação com o fornecedor. Não inventar esses campos no adapter real.

O usuário confirmou que somente boletos virão do SIPROV. Clientes, veículos, planos e protocolos terão origem no Supabase. Mantenha `customer.siprov_person_id` atribuído por funcionário após validação; não aceite codPessoa/codTitulo enviado livremente como autorização. Consulta deve sempre carregar o vínculo do usuário autenticado e conferir o titular de cada título antes de devolver um DTO mínimo.

DTO proposto: identificador interno, referência, valor retornado, vencimento, estado original + rótulo mapeado, boleto autorizado, linha digitável e Pix opcionais. Não recalcular estados ou marcar pago localmente. Ausência de Pix/linha/arquivo oculta a ação correspondente. Nunca fabricar código, banco ou valor. O modo mock deliberadamente não fornece pagamento nem download oficial.

Mesmo a documentação inicial mencionando help desk, a decisão atual é operação própria no Supabase. Não criar sincronização de atendimento SIPROV sem novo escopo.

## ZapSign — documentos e webhooks

Fontes oficiais:
- https://docs.zapsign.com.br/documentos/listar-documentos
- https://docs.zapsign.com.br/documentos/detalhar-documento.md
- https://docs.zapsign.com.br/webhooks/como-funciona
- https://docs.zapsign.com.br/webhooks/criar-webhook.md
- https://docs.zapsign.com.br/llms.txt

Consulta documentada: GET `/api/v1/docs/?page=1` (listagem da conta inteira) e GET `/api/v1/docs/{doc_token}/` (detalhe). Autenticação Bearer. Listagem possui filtros, inclusive signer_email, mas isso não substitui autorização local. Os arquivos original_file/signed_file têm links temporários (a documentação informa 60 minutos). A página de listagem contém informações divergentes de cache: 60 minutos no aviso e 60 segundos nas observações. Confirmar o comportamento e não prometer atualização instantânea com base nela.

Planejamento de associação antiga: exportação/listagem paginada apenas no backend restrito; conciliação de `external_id`, identificadores existentes e signatários com o cadastro conferido; revisão humana de ambiguidades; gravação de `document_links` com responsável/data. Nada fica visível antes da validação. Vínculo de signatário também deve ser explícito antes de liberar assinatura. Não retornar o array de outros signatários nem seus links ao cliente.

Listagem dos documentos do cliente deve começar pelos vínculos locais verificados. Detalhar somente tokens aprovados; retornar campos mínimos. Para download, obter URL temporária atual após nova checagem da propriedade, servir por proxy controlado ou redirecionamento validado sem persistir o arquivo. URLs de arquivos devem ter hosts permitidos e proteção contra SSRF; não executar fetch em URL livre vinda do cliente. Assinatura pendente só terá botão se existir link oficial do signatário certo, mecanismo autorizado e política de autenticação definida.

Webhooks documentam criação, assinatura, recusa, remoção e expiração, além de email_bounce e outros eventos no índice. As listas de opções entre telas/endpoints não são totalmente uniformes: confirmar eventos habilitados na conta. Criação de webhook é POST `/api/v1/user/company/webhook/`, com possibilidade de headers customizados. Não foi criada configuração externa.

A documentação orienta usar um segredo **exclusivo do receptor**, diferente da API key, em header configurado no webhook. Implementamos receptor local com comparação em tempo constante de `Authorization: Bearer <ZAPSIGN_WEBHOOK_SECRET>`, limite de corpo e deduplicação por digest. Sem segredo, responde 503; header incorreto, 401. Eventos válidos recebem 200 e somente digest + estado pending_reconciliation são guardados. Não há HMAC presumido nem atualização de contratos pelo payload. Este receptor é preparação, não integração ativa.

Próxima etapa: validar esquema e identidade do evento, incluir ID estável quando existir, armazenar entrada mínima durável e enfileirar reconciliação por documento já vinculado; consultar novamente API oficial, lidar com eventos repetidos/fora de ordem; backoff com jitter, limite de tentativas, dead letter, alerta operacional e reprocessamento seguro. Um digest de JSON por si só não detecta mensagens semanticamente iguais com ordem de chaves diferente; a homologação deve definir a chave semântica e eventos repetidos no tempo. Retornar 200 após persistência durável, sem esperar trabalho lento.

Ter assinatura paga não confirma API/webhooks: a documentação diz que a disponibilidade depende do plano/conta. Confirmar em Configurações > Integrações > API ZapSign e com suporte, incluindo custos e sandbox.

## Falhas e sincronização

Não há chamadas reais nesta etapa. Planejar timeout de 8–10 segundos por chamada (a homologar), retry somente de GET em falhas transitórias, respeitar Retry-After/429, circuit breaker, concorrência e paginação limitadas; nunca retry automático de emissão/alteração. Mostrar falha de cada fornecedor sem transformar erro em lista vazia. Não misturar dados mock com live. Se houver cache futuro, particionar por cliente, registrar data de consulta e respeitar expiração de links; não armazenar documentos completos sem necessidade.

Supabase: https://supabase.com/docs/guides/database/postgres/row-level-security. A proposta SQL habilita RLS e revoga escrita direta de anon/authenticated. Precisa passar testes reais de políticas em homologação; service_role ignora RLS e exige validação de escopo também no backend.
