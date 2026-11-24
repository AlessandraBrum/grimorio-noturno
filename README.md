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
| Web Speech API | A leitura em voz alta, com a voz que já vem no aparelho |
| PWA (manifesto) | Permite abrir por link ou QR code e, se a pessoa quiser, instalar na tela inicial |
| Fontsource | As fontes Atkinson Hyperlegible Next e Cormorant Garamond ficam dentro do app, sem depender do Google Fonts |
| Oxlint | Revisa o código e aponta erros comuns |
| MediaDevices e Canvas | Capturam o vídeo e preparam os quadros no navegador |
| Tesseract.js e WebAssembly | Reconhecem o nome da carta no aparelho, em português ou inglês |
| API do Scryfall | Consulta os nomes, textos e dados das cartas |
| Google Cloud Vision | OCR opcional do recorte do título, habilitado com a variável de ambiente de servidor `GOOGLE_CLOUD_VISION_API_KEY` |
| Vercel | Hospeda o site publicado |

### Como o app conversa com o Scryfall

O Scryfall é um site público com os dados de todas as cartas de Magic. O app pede as informações direto à API dele, sem chave de acesso e sem servidor próprio no meio:

- Enquanto a pessoa digita, o app pede sugestões de nomes (`/cards/autocomplete`).
- Quando ela escolhe, busca a carta pelo nome, aceitando pequenos erros de digitação (`/cards/named?fuzzy=`).
- Depois, procura se existe uma versão da carta em português (`/cards/search` com `lang:pt`). Se não existir, mostra em inglês e avisa.

Para respeitar as regras do Scryfall, o app espera pelo menos 100 ms entre um pedido e outro, guarda as cartas já abertas no aparelho e mostra as imagens originais, sem cortar nem mudar cores, com o nome do artista.

### Câmera com Tesseract (versão 3)

Ao abrir a câmera, o Grimório prepara apenas o modelo do idioma selecionado (português ou inglês). A leitura com Tesseract.js usa o quadro inteiro, com uma imagem menor na maioria das tentativas. Periodicamente, tenta de novo com mais resolução e correção de inclinação. O reconhecimento acontece no aparelho, e o aplicativo envia ao Scryfall apenas os nomes candidatos.

Na busca escrita, digite o nome exato ou escolha uma das sugestões. Na câmera e ao escolher uma foto, o app compara o nome e o tipo com os dados da carta. Quando encontra um candidato, pede confirmação antes de abrir a ficha. Se o Scryfall não tiver o texto completo em português, a ficha avisa e usa o conteúdo em inglês.

Antes disso, a versão 2 vai permitir falar o nome da carta, usando o reconhecimento de voz do navegador.

## O que estou aprendendo

- React com TypeScript: dividir as telas em componentes e dar tipos aos dados das cartas.
- Consumir uma API pública com cuidado: limite de pedidos, erros, falta de internet e guardar dados no aparelho.
- Acessibilidade na prática: contraste AAA, navegação por teclado, leitor de tela, movimento reduzido e linguagem simples.
- Design system: transformar um protótipo em tokens de cor, tipografia e componentes.
- Recursos do navegador: leitura em voz alta e, nas próximas versões, reconhecimento de voz e OCR com câmera.
- PWA: fazer um site funcionar como app no celular.

## Rodar no computador

Com o Node.js instalado, abra o terminal na pasta do projeto e rode:

```bash
npm install
npm run dev
```

O primeiro comando baixa o que o projeto precisa, e só é necessário na primeira vez. O segundo abre o app no navegador.

## Aviso

Este é um projeto independente sem qualquer vínculo, endosso ou afiliação com a Wizards of the Coast LLC ou Hasbro. Magic: The Gathering, seus respectivos logotipos, símbolos de mana e designs de cartas são propriedades registradas da Wizards of the Coast LLC. API do Scryfall.


## Formulário de contato

Abra **Ajustes → Contato** ou use o link em Ajuda, Sobre ou no rodapé. Escolha o assunto, escreva a
mensagem e informe por onde quer receber a resposta. Você pode anexar várias
imagens, revisar a lista e remover anexos antes de enviar. Os atalhos
**Reportar erro** na câmera e na ficha selecionam o assunto automaticamente e
incluem uma captura quando houver. A captura só é transmitida ao enviar.

### Ativar o envio na Vercel

1. [Verifique um domínio de envio no Resend](https://resend.com/docs/dashboard/domains/introduction).
2. [Crie uma chave de API no Resend](https://resend.com/api-keys) com permissão de envio.
3. Na Vercel, em **Settings → Environment Variables**, adicione
   `RESEND_API_KEY` com essa chave e `CONTATO_EMAIL_REMETENTE` com um endereço
   do domínio verificado. Selecione Production ou Preview conforme o ambiente
   onde vai testar. Guarde a chave apenas no servidor.
4. Faça um novo deploy para a Vercel carregar as variáveis. O Vite sozinho
   renderiza a página local, e a função `/api/contato` roda na Vercel.
5. Abra o formulário no deploy e envie uma mensagem com duas imagens.
   Confira a chegada em `ambuxedev@gmail.com` e teste o botão **Responder**.
   Teste também a opção WhatsApp, que inclui o número internacional no corpo
   para você abrir uma conversa e responder manualmente.

As partes chegam com o mesmo protocolo e sua posição na sequência. O formulário
aceita texto sem contagem máxima e permite adicionar imagens em múltiplas
seleções. Imagens maiores são reduzidas no dispositivo para caber em 3 MB por
anexo. Se o navegador não conseguir abrir o formato, exporte a foto como JPEG
ou PNG e tente novamente. Se uma
parte falhar, o botão **Continuar envio** retoma das partes ainda sem confirmação
enquanto a página estiver aberta. O Resend aplica suas próprias cotas de envio.

A rota aceita apenas envios da origem do site e encaminha para o destinatário
fixo. Contra spam, há um campo oculto e um limite de 60 partes a cada 10
minutos por IP em cada instância da função.
