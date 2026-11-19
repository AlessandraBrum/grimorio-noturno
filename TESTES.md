# Testes do Grimório Noturno

Este guia explica os testes automáticos do projeto, sem pressupor que você já sabe programar testes.

## 1. O que é um teste automático

É um robô que abre o app num navegador de verdade, clica, digita e confere se aconteceu o que deveria. Em vez de você abrir o app e testar tudo na mão depois de cada mudança, roda um comando e em menos de um minuto sabe se algo quebrou.

## 2. O que foi instalado

Duas ferramentas, só para desenvolvimento (não vão para o app que o público usa):

- **Playwright**: o robô. Abre o navegador Chromium, finge ser um computador ou um celular e faz as ações.
- **axe-core**: o fiscal de acessibilidade. Lê a página e aponta problemas das regras WCAG, incluindo o nível AAA (contraste 7:1, por exemplo).

## 3. Arquivos novos

```
playwright.config.ts          configuração geral dos testes
testes/
  apoio/
    scryfall-falso.ts         Scryfall de mentira, usado em todos os testes
    acessibilidade.ts         chama o fiscal axe com as regras WCAG A, AA e AAA
  busca.spec.ts               buscar carta, sugestões, carta inexistente, sem internet, recentes
  acessibilidade.spec.ts      passa o fiscal em todas as telas, nos temas escuro e claro
  teclado.spec.ts             link de pular, foco no painel de ajustes, contorno de foco
  movimento.spec.ts           animações respeitando o sistema e o botão do app
```

Também mudaram:

- `package.json`: ganhou os comandos `test`, `test:ui` e `test:relatorio`.
- `.gitignore`: ignora as pastas que o Playwright cria (`test-results`, `playwright-report`), para elas não irem para o GitHub.

Todo arquivo de teste termina em `.spec.ts`. É assim que o Playwright sabe que ele é um teste.

## 4. Como rodar

Abra o terminal na pasta do projeto.

Rodar todos os testes:

```powershell
npm test
```

Ele monta o app sozinho (igual ao que vai para o ar), abre o navegador escondido e roda tudo duas vezes: uma como **computador** e outra como **celular** (Pixel 7). Você não precisa deixar o `npm run dev` ligado.

Rodar com uma janela visual, onde dá para ver o robô trabalhando passo a passo:

```powershell
npm run test:ui
```

Ver o relatório bonito da última vez que rodou, com prints das falhas:

```powershell
npm run test:relatorio
```

Rodar só um arquivo:

```powershell
npx playwright test testes/teclado.spec.ts
```

Rodar só como celular:

```powershell
npx playwright test --project=celular
```

Rodar só os testes que têm uma palavra no nome:

```powershell
npx playwright test -g "sem internet"
```

## 5. Como ler o resultado

No fim aparece algo como:

```
  7 failed
  41 passed (25.5s)
```

`passed` é o que funcionou. `failed` é o que falhou. Para cada falha, o terminal mostra o nome do teste, o que era esperado e o que aconteceu. Nas falhas de acessibilidade aparece assim:

```
"regra": "color-contrast-enhanced",
"problema": "Elements must meet enhanced color contrast ratio thresholds",
"onde": [ "a[aria-current=\"page\"]" ]
```

Quer dizer: a regra de contraste AAA falhou, no link da aba que está ativa no menu.

Para entender melhor, rode `npm run test:relatorio`. Clique no teste que falhou: tem um print da tela no momento da falha e um "trace", que é uma gravação de cada passo.

## 6. O que cada teste confere

**Busca** (`busca.spec.ts`)
- Digitar "midnight" mostra 3 sugestões, a seta para baixo escolhe uma e Enter abre a carta.
- A carta aberta mostra nome, tipo, imagem com texto alternativo e o título da aba do navegador.
- Um nome que não existe mostra o aviso de carta não encontrada.
- Sem internet, aparece o aviso certo.
- A carta aberta passa a aparecer em "Vistas recentemente".

**Acessibilidade** (`acessibilidade.spec.ts`)
- O fiscal axe passa em Buscar, Glossário, Leitura, Ajuda, Sobre, na tela da carta e com o painel de ajustes aberto.
- Tudo isso no tema escuro e no tema claro, no computador e no celular.

**Teclado** (`teclado.spec.ts`)
- O primeiro Tab cai no link "Pular para a busca", e Enter leva direto ao campo.
- O painel de ajustes abre pelo teclado, o foco vai para o botão de fechar, o Tab nunca cai em algo atrás do painel, e Esc fecha e devolve o foco ao botão que abriu.
- Todo elemento que recebe foco mostra um contorno visível de pelo menos 2px.

**Animações** (`movimento.spec.ts`)
- Com o sistema liberando movimento, a gaveta de ajustes desliza.
- Com "reduzir movimento" ligado no sistema, a animação para, **mesmo que o botão do app esteja ligado**.
- Com o botão do app desligado, a animação também para.

## 7. Por que um Scryfall de mentira

Os testes nunca falam com o Scryfall de verdade. O arquivo `testes/apoio/scryfall-falso.ts` intercepta os pedidos e responde com uma carta inventada, a "Midnight Owl". Isso traz três vantagens:

- Os testes não quebram se o Scryfall estiver fora do ar ou lento.
- Não gastamos o limite de pedidos da API deles.
- O resultado é sempre igual, então uma falha é sempre culpa do app, não da internet.

Ele também bloqueia qualquer outro endereço de fora, para garantir que o app não envia nada para lugar nenhum durante os testes.

## 8. Escrevendo um teste novo

Exemplo: conferir que a tela Glossário tem o título certo. Crie `testes/glossario.spec.ts`:

```ts
import { expect, test } from './apoio/scryfall-falso'

test('glossário mostra o título', async ({ page }) => {
  await page.goto('/#glossario')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Glossário')
})
```

Lendo em português:

1. `import ... from './apoio/scryfall-falso'`: usa a versão do teste que já vem com o Scryfall falso.
2. `test('nome', ...)`: dá um nome ao teste. É o que aparece no resultado.
3. `page.goto('/#glossario')`: abre o app na tela Glossário.
4. `getByRole('heading', { level: 1 })`: procura o título principal (h1), do mesmo jeito que um leitor de tela procura.
5. `toHaveText('Glossário')`: confere que o texto é esse.

Prefira sempre achar as coisas por **papel e nome** (`getByRole('button', { name: 'Abrir ajustes' })`). Se o teste consegue achar o botão assim, um leitor de tela também consegue. Isso já é um teste de acessibilidade de graça.

Os comandos que você mais vai usar:

| Comando | O que faz |
| --- | --- |
| `page.goto('/#tela')` | abre uma tela |
| `page.getByRole('button', { name: '...' })` | acha um botão pelo nome |
| `page.getByText('...')` | acha um texto |
| `.click()` | clica |
| `.fill('texto')` | digita num campo |
| `.press('Enter')` | aperta uma tecla |
| `expect(...).toBeVisible()` | confere que aparece |
| `expect(...).toBeFocused()` | confere que está com o foco |

Para descobrir os comandos sem decorar, rode `npx playwright codegen http://localhost:5173` com o `npm run dev` ligado. Abre o app, você clica nas coisas e ele escreve o código do teste para você.

## 9. O que os testes não substituem

O fiscal axe encontra uma parte dos problemas de acessibilidade, não todos. Continue fazendo:

- Conferir as cores no Contrast Checker da Adobe.
- Navegar pelo app só com o teclado.
- Testar com leitor de tela (NVDA no Windows, TalkBack no Android, VoiceOver no iPhone).
- Ampliar a página para 200% e 400% e ver se nada quebra.

Hoje os testes usam só o Chromium (base do Chrome e do Edge). Para testar também o Safari do iPhone, dá para adicionar o WebKit depois, rodando `npx playwright install webkit` e criando mais um projeto em `playwright.config.ts`.
