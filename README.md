# Grimório Noturno

Um app gratuito que ajuda a entender cartas de Magic: The Gathering na hora, na mesa de jogo.

Você digita o nome da carta e o app mostra a imagem original, explica o custo de mana em palavras ("3 genéricos e 2 brancos") e lê tudo em voz alta. As palavras do jogo, como "Voar" e "Atropelar", têm explicações curtas no glossário.

Faz parte do Luna Softwares.

## Para quem é

- Para quem tem baixa visão: letra grande, contraste alto e leitura em voz alta.
- Para quem tem daltonismo: as cores de mana sempre aparecem também escritas, então não é preciso reconhecer a cor.
- Para quem tem dislexia: fonte feita para facilitar a leitura e espaçamento ajustável.
- Para quem está começando e ainda não conhece os termos do jogo.
- Para quem joga em loja ou evento, com pouco tempo e internet fraca: as cartas já vistas abrem mesmo sem internet.

## O que dá para fazer

- Buscar a carta pelo nome, com sugestões enquanto digita.
- Ver a imagem original da carta ao lado da versão em texto.
- Ouvir a carta em voz alta e escolher a velocidade.
- Ajustar o tamanho da letra, o espaçamento e o contraste.
- Usar o tema noturno ou o claro (sem tons muito claros, pensando em quem tem sensibilidade à luz).
- Desligar as animações. Se o celular ou o computador estiver com "reduzir movimento" ligado, elas já ficam desligadas.
- Usar o app todo pelo teclado.
- Trocar o idioma do app entre português e inglês.

Em breve: buscar a carta falando o nome e apontando a câmera.

## Privacidade

O app não pede cadastro e não usa anúncios nem rastreio. Suas preferências e as últimas cartas abertas ficam guardadas só no seu aparelho.



## Como foi feito

### Tecnologias

| O quê | Para que serve aqui |
| --- | --- |
| HTML, CSS e JavaScript | A base de tudo o que aparece na tela |
| TypeScript | JavaScript com tipos, que avisa sobre erros antes de o app rodar |
| React | Monta as telas a partir de peças reutilizáveis, como o botão e a barra de abas |
| Vite | Roda o app no computador durante o desenvolvimento e gera a versão final |
| CSS com variáveis | Cores, espaçamentos e temas (noturno e claro) num lugar só, sem framework de CSS |
| Web Speech API | A leitura em voz alta e a busca falando o nome da carta, com os recursos que já vêm no aparelho |
| PWA (manifesto) | Permite abrir por link ou QR code e, se a pessoa quiser, instalar na tela inicial |
| Fontsource | As fontes Atkinson Hyperlegible Next e Cormorant Garamond ficam dentro do app, sem depender do Google Fonts |
| Oxlint | Revisa o código e aponta erros comuns |
| Playwright e axe-core | Testes que abrem o app num navegador de verdade e conferem as regras de acessibilidade, até o nível AAA |
| MediaDevices e Canvas | Abrem a câmera e preparam os quadros para a leitura no próprio aparelho |
| Tesseract.js e WebAssembly | Leem o nome escrito na carta, no aparelho, em português ou inglês |
| Base de tipos e custos | Arquivo gerado a partir dos dados gratuitos do Scryfall com o tipo, o custo de mana e o poder/resistência de cada carta, usado para desempatar nomes parecidos |
| API do Scryfall | Consulta nomes, textos, imagens e o catálogo de nomes das cartas |
| Resend | Entrega por e-mail as mensagens do formulário de contato |
| Vercel | Hospeda o site e a função que envia o formulário |

### Como o app conversa com o Scryfall

O Scryfall é um site público com os dados de todas as cartas de Magic. O app pede as informações direto à API dele, sem chave de acesso e sem servidor próprio no meio:

- Enquanto a pessoa digita, o app pede sugestões de nomes (`/cards/autocomplete`) e mostra até oito.
- Quando ela escolhe, procura primeiro a versão da carta em português (`/cards/search` com o nome entre aspas e `lang:pt`). Se a carta não tiver texto em português, busca a mesma carta em inglês e avisa na ficha.
- Quando o nome vem da câmera ou da voz, aceita pequenos erros de digitação (`/cards/named?fuzzy=`) e, se preciso, procura pelas palavras lidas (`/cards/search` com `lang:` e os termos). Depois compara o que foi lido com os nomes encontrados e só aceita quando a semelhança é alta. Se dois nomes ficarem parecidos, pede confirmação antes de abrir.
- O catálogo com todos os nomes de cartas (`/catalog/card-names`) é baixado uma vez, fica guardado por 14 dias no aparelho e é usado para comparar o que o leitor da câmera entendeu. Se o download falhar, o app usa a lista que vem dentro dele. Os nomes em português vêm de um arquivo próprio.
- As cartas já abertas e as buscas recentes ficam guardadas no aparelho, então voltar a uma carta vista antes não gasta internet.

Para respeitar as regras do Scryfall, o app espera pelo menos 100 ms entre um pedido e outro, desiste de um pedido que passe de 3,5 s, tenta de novo uma vez e avisa quando está sem internet. As imagens aparecem na versão original, sem cortar nem mudar cores, com o nome do artista.

### Câmera: como o app reconhece a carta

Ao abrir a câmera, o app espera a imagem parar por 250 ms e confere se há contraste suficiente. Assim ele não lê um quadro tremido.

Depois, procura o retângulo da carta na imagem, endireita a foto e tenta ler o nome na faixa do topo. Se o nome não aparecer ali, tenta as outras faixas de texto e também a carta de lado ou de cabeça para baixo. Cada tentativa tem um limite de tempo, para o app continuar respondendo enquanto procura.

A leitura do nome usa o Tesseract.js, que roda dentro do aparelho. Ele é preparado só com os modelos de português e inglês, lê uma linha de cada vez e ignora os caracteres que não aparecem em nomes de cartas. Os modelos e o motor ficam dentro do próprio app, então não é preciso baixar nada de fora na primeira leitura.

O texto lido é comparado com o catálogo de nomes de cartas, tolerando letras trocadas, nomes cortados e pedaços do nome. Quando a leitura fica na dúvida entre nomes parecidos, o app desempata nesta ordem: lê a linha de tipo (criatura, feitiço, mágica instantânea, terreno...), conta os símbolos do custo de mana no canto do nome e, em criaturas, lê o poder e a resistência. Depois compara com a base de tipos e custos. A arte não entra na decisão, porque muda entre edições, cartas foil e artes personalizadas.

Quando a leitura não fecha, o app dá uma dica: aproximar a carta ou endireitar, com vibração e um aviso sonoro curto. Se continuar em dúvida, mostra até três candidatos e pede confirmação antes de abrir a ficha.

O reconhecimento acontece no aparelho, e o app envia ao Scryfall apenas os nomes candidatos. O recorte da imagem não sai do aparelho.

## O que estou aprendendo

- Ler imagem no navegador: pegar o quadro da câmera, achar o contorno da carta, corrigir a inclinação e deixar a imagem pronta para o leitor de texto.
- OCR na prática: escolher os parâmetros do Tesseract, limitar os caracteres aceitos e conviver com o que ele erra.
- Comparar texto com tolerância a erros: catálogo indexado por trigramas, distância de edição e limites de confiança em vez de igualdade exata.
- Desempatar com regras do jogo: usar a linha de tipo, o custo de mana e o poder/resistência, que toda carta traz impressos, em vez da arte.
- Orçamento de tempo: decidir quanto o app pode gastar por quadro e cortar caminho quando a resposta já está boa.
- Acessibilidade na prática: contraste AAA, navegação por teclado, leitor de tela, movimento reduzido, linguagem simples e testes automáticos com o axe.
- Testes que abrem o navegador de verdade: Playwright simulando câmera, microfone, rede e um Scryfall de mentira.
- Consumir uma API pública com cuidado: limite de pedidos, espera entre chamadas, erros, falta de internet e cache no aparelho.
- React com TypeScript: dividir as telas em componentes, dar tipos aos dados das cartas e manter o estado previsível.
- Design system: transformar um protótipo em tokens de cor, tipografia e componentes.
- PWA: fazer um site funcionar como app no celular, com manifesto, ícones e tema.


## Formulário de contato

Abra **Contato** ou use o link em Ajuda, Sobre ou no rodapé. Escolha o assunto, escreva a
mensagem e informe por onde quer receber a resposta. Você pode anexar várias
imagens, revisar a lista e remover anexos antes de enviar. Os atalhos
**Reportar erro** na câmera e na ficha selecionam o assunto automaticamente e
incluem uma captura quando houver. A captura só é transmitida ao enviar.


## Aviso

Este é um projeto independente sem qualquer vínculo, endosso ou afiliação com a Wizards of the Coast LLC ou Hasbro. Magic: The Gathering, seus respectivos logotipos, símbolos de mana e designs de cartas são propriedades registradas da Wizards of the Coast LLC. API do Scryfall.