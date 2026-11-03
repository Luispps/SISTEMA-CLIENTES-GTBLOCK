# Demonstração para Vercel

Esta adaptação gera uma versão **estática de apresentação**, separada do servidor Node/SQLite original. Não é a implantação do portal de produção.

## O que o cliente consegue explorar

As mesmas telas e contas fictícias, painel, cobranças/contratos de exemplo, assinatura, perfil, central/Getrak, solicitações com protocolo e respostas pela equipe. O login é **simulado no navegador**, com credenciais públicas de demonstração. Não constitui segurança real e não pode receber dados de clientes reais.

As interações ficam em `sessionStorage` da aba. Para mostrar o ciclo completo, entre como cliente, abra um pedido, saia e entre como equipe **na mesma aba**. Um visitante em outro navegador não recebe essas solicitações. Recarregar a aba mantém o exemplo; fechar a sessão da aba ou clicar em **Reiniciar exemplos** restaura a demonstração. Se o armazenamento estiver bloqueado, o exemplo funciona em memória e se perde ao recarregar. Não há email, mensagem ao comercial ou atendimento real enviado pelo portal.

SIPROV, ZapSign e Supabase continuam desconectados. Não há boleto pagável, Pix, linha digitável, download oficial ou assinatura. Os telefones da central e o endereço Getrak continuam sendo links externos reais; não acione ligações durante testes.

## Gerar e conferir localmente

```powershell
npm run build
npm run preview
```

Abrir http://127.0.0.1:4320. Não abrir o HTML pelo sistema de arquivos. O preview usa os cabeçalhos de segurança configurados para Vercel. Parar com Ctrl+C.

`npm run dev` continua iniciando **o servidor original local** na porta 4310, com autenticação/SQLite. O build não modifica seus arquivos, contas nem banco.

## Importar na Vercel após autorização de publicação

Se o repositório contém a pasta `portal` como raiz (repositório próprio deste projeto):

| Campo | Valor |
| --- | --- |
| Framework Preset | Other |
| Root Directory | Raiz do repositório (`.`) |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js | 24.x |
| Variáveis de ambiente | Nenhuma necessária para a demonstração |

O arquivo `vercel.json` já declara build, saída e cabeçalhos. Não escolher Express, não usar `npm start` como servidor Vercel e não publicar `public/` diretamente: essa pasta contém o frontend da versão local que depende da API.

Nenhum segredo deve ser adicionado à Vercel para essa apresentação. Use um projeto novo e endereço de demonstração separado do site institucional. Um repositório privado não torna a URL de demonstração privada: confira a configuração de acesso da hospedagem antes de compartilhar. `noindex` é orientação para buscadores, não controle de acesso.

## Conteúdo publicado

O build copia apenas HTML/CSS/JS de apresentação, duas imagens da marca, fixtures explícitas e robots.txt. Não inclui `server/`, `data/`, `.env`, banco, sessões, emails de recuperação, documentação ou testes. A CSP bloqueia conexões de API (`connect-src 'none'`), e o código da apresentação não faz chamadas `/api`. Fontes do Google ainda são carregadas externamente e os links de telefone/Getrak/Instagram continuam disponíveis.

Não enviar manualmente a pasta inteira do projeto como arquivos públicos. O código do servidor estará no repositório privado como fonte, mas só `dist/` é a saída estática da implantação.

## Próxima etapa real

Depois da aprovação comercial, conectar Supabase Auth/Postgres e adaptar a API para hospedagem, com sessões seguras, autorização no servidor e integrações SIPROV/ZapSign. Não reutilizar o adapter de navegador para dados reais. A autenticação do servidor original continua disponível localmente e não foi enfraquecida para possibilitar essa apresentação.

Referências oficiais consultadas: https://vercel.com/docs/project-configuration e https://vercel.com/docs/builds/configure-a-build.
