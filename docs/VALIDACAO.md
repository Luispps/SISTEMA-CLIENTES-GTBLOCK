# Validação da etapa local

## Adaptação de apresentação Vercel

Validação adicional: `npm run check`, `npm run build` e `npm test` aprovados, **17 testes no total** (os 13 do servidor original e 4 da demonstração estática). Build gerado com allowlist, sem banco, .env, backend ou fetch de API. Cabeçalhos Vercel incluem CSP com connect-src 'none' e noindex.

Os novos testes conferem pacote estático, persistência por aba/reload, separação entre visitantes, simulação dos perfis, resposta e histórico, idempotência, estados vazio/indisponível, recuperação sem envio e funcionamento em memória se storage for bloqueado. Essas checagens de apresentação não transformam permissões no navegador em autorização de produção. O servidor original permanece separado.

Execução real da Vercel só pode ser confirmada após implantação autorizada; build local aprovado não é evidência de deploy. Instruções em `VERCEL.md`.

Prévia estática em navegador: login de cliente, abertura de pedido comercial, protocolo, persistência ao recarregar, troca para equipe na mesma aba, filtro Comercial, resposta e reinício dos exemplos exercitados. Avisos de simulação conferidos na tela de login, formulário, histórico e barra persistente.

Execução em 02/11/2026 (America/Sao_Paulo). Node 24.22.1 / Windows.

## Verificações automatizadas

`npm run check`: aprovado, sintaxe do backend e frontend.

`npm test`: **13 testes, 13 aprovados**. Servidor na porta 4319 e SQLite temporário, sem credenciais de fornecedor.

1. Bloqueio anônimo e senha inválida, ausência de senha em texto no banco.
2. Cookies HttpOnly/SameSite e cabeçalhos de segurança.
3. Isolamento Ana/Bruno nas listas e nas URLs diretas de cobrança/contrato.
4. Fronteiras entre cliente, atendimento e administrador.
5. Rejeição de CSRF e origem não autorizada.
6. Persistência de protocolo, idempotência e ausência de mudança automática de plano.
7. Resposta exclusiva de funcionário, responsável e histórico.
8. Diferença entre estado vazio e fornecedor indisponível.
9. Webhook autenticado, recusa sem segredo válido e deduplicação exata do evento.
10. Recuperação com resposta genérica, token único e invalidação de sessões.
11. Logout revoga sessão no servidor.
12. Limite de tentativas de login.
13. Bloqueio de produção e modo live, `.env` não servido.

## Verificação no navegador

Larguras observadas: **320, 390, 768 e 1440 px**. Nenhuma rolagem horizontal no painel nessas larguras. Em 320 px foi encontrada truncagem do texto do banner e corrigida pela altura adaptável; nova captura confirmou o link visível.

Fluxos exercitados:
- Login e logout de cliente/equipe.
- Menu mobile e acesso às áreas.
- Financeiro, detalhe fictício sem código de pagamento.
- Contratos, detalhe identificado sem validade ou assinatura real.
- Minha assinatura, formulário de mudança de plano.
- Abertura com protocolo `GT-2026-E5161DA8` no banco de demonstração.
- Painel da equipe, filtro Comercial, resposta registrada e histórico com ator/estado.
- Estados sem dados e indisponível pelo seletor de cenários.
- Central com os dois links `tel:` confirmados e link externo Getrak.
- Inspeção visual desktop/mobile/tablet, controles e reflow.

Capturas: `screenshots/desktop.jpg`, `screenshots/mobile.jpg`. Dados exibidos são fictícios. Não foi efetuada ligação ou navegação autenticada em Getrak/SIPROV/ZapSign.

## Limites

Validação visual e testes de integração locais, não pentest. Não houve teste com dispositivos físicos ou leitor de tela. Foco visível, labels, menu oculto fora da navegação por teclado e dialog nativo foram implementados; acessibilidade completa deve ser auditada na homologação. As políticas de movimento reduzido estão no CSS.

Supabase SQL não executado: sem credenciais/projeto autorizado. RLS e integração Auth precisam de testes próprios de banco e de ponta a ponta após adaptação. Nenhum webhook externo foi registrado, email real enviado, boleto acessado no fornecedor ou documento real consultado. Não há validação de disponibilidade da API na conta da empresa.
