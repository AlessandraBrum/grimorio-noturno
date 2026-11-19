"use strict";

const API = "https://api.scryfall.com";
const SIMBOLOS_URL = "https://svgs.scryfall.io/card-symbols/";

const TEXTOS = {
  pt: {
    pular: "Pular para o conteúdo", voltar: "Voltar", trocarIdioma: "Trocar idioma",
    buscarTitulo: "Qual carta você quer ler?", campoRotulo: "Nome da carta", buscar: "Buscar",
    buscaDica: "Digite 2 letras ou mais. Pode ser em inglês ou português.",
    sugestoesRotulo: "Sugestões", nSugestoes: (n) => n === 1 ? "1 sugestão. Use as setas para escolher." : `${n} sugestões. Use as setas para escolher.`,
    semSugestao: "Nenhuma sugestão para esse nome.",
    recentes: "Lidas recentemente", recentesVazio: "As cartas que você abrir ficam aqui e abrem mesmo sem internet.",
    breveTitulo: "Em breve", breveVoz: "Falar o nome da carta", breveCamera: "Apontar a câmera para a carta",
    carregando: "Carregando a carta…", naoEncontrada: "Não achei uma carta com esse nome. Confira a grafia ou tente o nome em inglês.",
    semInternet: "Sem internet. As cartas que você já abriu continuam disponíveis em “Lidas recentemente”.",
    erroGeral: "Não consegui falar com a Scryfall agora. Tente de novo em alguns segundos.",
    digiteMais: "Digite pelo menos 2 letras.",
    custo: "Custo", semCusto: "Esta carta não tem custo de mana.", valorTotal: (n) => `Valor total: ${n}`,
    texto: "Texto da carta", forca: "Força e resistência", lealdade: "Lealdade",
    palavrasChave: "Palavras-chave", imagemOriginal: "Imagem original da carta",
    mostrarImagem: "Mostrar imagem original", esconderImagem: "Esconder imagem original",
    ilustracao: (a) => `Ilustração: ${a}`, avisoIngles: "Esta carta ainda não tem versão em português. O texto está em inglês.",
    avisoInglesEs: "Esta carta ainda não tem versão em espanhol. O texto está em inglês.",
    creditos: (a) => `Imagem e dados: Scryfall. Ilustração de ${a}. ™ e © Wizards of the Coast.`, verScryfall: "Ver na Scryfall",
    ouvir: "Ouvir a carta", ler: "Ler em voz alta", pausar: "Pausar", continuar: "Continuar", parar: "Parar",
    velocidade: "Velocidade da voz", lendo: "Lendo a carta em voz alta.", pausado: "Leitura pausada.", parado: "Leitura parada.",
    semVoz: "Este navegador não consegue ler em voz alta.",
    forcaFala: (p, r) => `Força ${p}, resistência ${r}.`, faces: (n) => `Lado ${n}`,
    glossarioTitulo: "Glossário", glossarioIntro: "Palavras-chave que aparecem nas cartas, explicadas em poucas palavras.",
    glossarioFiltro: "Procurar palavra", nTermos: (n) => n === 1 ? "1 palavra" : `${n} palavras`, conteudoEmPt: "Por enquanto, este conteúdo está só em português.",
    ajustesTitulo: "Leitura e ajustes", previa: "Prévia", previaCusto: "2 de qualquer tipo e 1 azul", previaTexto: "Voar. Quando esta criatura entra, compre uma carta.",
    leitura: "Modo de leitura", tamanho: "Tamanho da letra", tam1: "normal", tam2: "grande", tam3: "maior", tam4: "máximo",
    espacamento: "Espaçamento", esp1: "Normal", esp2: "Amplo", esp3: "Extra",
    contraste: "Contraste máximo", contrasteDesc: "Fundo mais escuro e letras mais claras, sem tons intermediários.",
    aparencia: "Aparência", tema: "Tema", temaSistema: "Do aparelho", temaClaro: "Claro", temaEscuro: "Escuro",
    animacoes: "Animações", animacoesDesc: "Transições suaves entre as telas.",
    animacoesTravadas: "Desligadas porque o seu aparelho pede menos movimento.",
    paleta: "Paleta de cores (só no protótipo)", paletaDesc: "Escolha qual paleta seguirá para o app.",
    idioma: "Idioma do app", cancelar: "Cancelar", confirmar: "Confirmar",
    ajudaTitulo: "Antes de usar", ajudaIntro: "O que pode mudar de um aparelho para outro, em poucas palavras.",
    navPrincipal: "Principal", abaBuscar: "Buscar", abaGlossario: "Glossário", abaAjustes: "Leitura", abaAjuda: "Antes de usar",
    voltarTopo: "Voltar ao topo", idiomaTrocado: "Idioma trocado para português.",
    tituloBuscar: "Buscar carta", tituloGlossario: "Glossário", tituloAjustes: "Leitura e ajustes", tituloAjuda: "Antes de usar",
    cores: { W: ["branco", "brancos"], U: ["azul", "azuis"], B: ["preto", "pretos"], R: ["vermelho", "vermelhos"], G: ["verde", "verdes"], C: ["incolor", "incolores"], S: ["de neve", "de neve"] },
    generico: (n) => `${n} de qualquer tipo`, ou: "ou", e: "e", vida: "2 de vida", xEscolhe: "X (você escolhe o valor)",
    virar: "virar", desvirar: "desvirar", energia: "energia", meio: "meio",
  },
  en: {
    pular: "Skip to content", voltar: "Back", trocarIdioma: "Change language",
    buscarTitulo: "Which card do you want to read?", campoRotulo: "Card name", buscar: "Search",
    buscaDica: "Type 2 letters or more.",
    sugestoesRotulo: "Suggestions", nSugestoes: (n) => n === 1 ? "1 suggestion. Use arrow keys to choose." : `${n} suggestions. Use arrow keys to choose.`,
    semSugestao: "No suggestions for this name.",
    recentes: "Recently read", recentesVazio: "Cards you open stay here and work even offline.",
    breveTitulo: "Coming soon", breveVoz: "Say the card name", breveCamera: "Point the camera at the card",
    carregando: "Loading card…", naoEncontrada: "No card found with that name. Check the spelling.",
    semInternet: "No internet. Cards you already opened are still in “Recently read”.",
    erroGeral: "Couldn't reach Scryfall right now. Try again in a few seconds.",
    digiteMais: "Type at least 2 letters.",
    custo: "Cost", semCusto: "This card has no mana cost.", valorTotal: (n) => `Total value: ${n}`,
    texto: "Card text", forca: "Power and toughness", lealdade: "Loyalty",
    palavrasChave: "Keywords", imagemOriginal: "Original card image",
    mostrarImagem: "Show original image", esconderImagem: "Hide original image",
    ilustracao: (a) => `Illustration: ${a}`, avisoIngles: "", avisoInglesEs: "",
    creditos: (a) => `Image and data: Scryfall. Illustrated by ${a}. ™ & © Wizards of the Coast.`, verScryfall: "View on Scryfall",
    ouvir: "Listen to the card", ler: "Read aloud", pausar: "Pause", continuar: "Resume", parar: "Stop",
    velocidade: "Voice speed", lendo: "Reading the card aloud.", pausado: "Reading paused.", parado: "Reading stopped.",
    semVoz: "This browser can't read aloud.",
    forcaFala: (p, r) => `Power ${p}, toughness ${r}.`, faces: (n) => `Side ${n}`,
    glossarioTitulo: "Glossary", glossarioIntro: "Keywords found on cards, explained in a few words.",
    glossarioFiltro: "Find a word", nTermos: (n) => n === 1 ? "1 word" : `${n} words`, conteudoEmPt: "For now, this content is only in Portuguese.",
    ajustesTitulo: "Reading and settings", previa: "Preview", previaCusto: "2 generic and 1 blue", previaTexto: "Flying. When this creature enters, draw a card.",
    leitura: "Reading mode", tamanho: "Text size", tam1: "normal", tam2: "large", tam3: "larger", tam4: "maximum",
    espacamento: "Spacing", esp1: "Normal", esp2: "Wide", esp3: "Extra",
    contraste: "Maximum contrast", contrasteDesc: "Darker background and brighter text, no mid tones.",
    aparencia: "Appearance", tema: "Theme", temaSistema: "Device", temaClaro: "Light", temaEscuro: "Dark",
    animacoes: "Animations", animacoesDesc: "Smooth transitions between screens.",
    animacoesTravadas: "Off because your device asks for reduced motion.",
    paleta: "Color palette (prototype only)", paletaDesc: "Choose which palette goes to the app.",
    idioma: "App language", cancelar: "Cancel", confirmar: "Confirm",
    ajudaTitulo: "Before you use it", ajudaIntro: "What may change from one device to another.",
    navPrincipal: "Main", abaBuscar: "Search", abaGlossario: "Glossary", abaAjustes: "Reading", abaAjuda: "Before use",
    voltarTopo: "Back to top", idiomaTrocado: "Language changed to English.",
    tituloBuscar: "Search card", tituloGlossario: "Glossary", tituloAjustes: "Reading and settings", tituloAjuda: "Before you use it",
    cores: { W: ["white", "white"], U: ["blue", "blue"], B: ["black", "black"], R: ["red", "red"], G: ["green", "green"], C: ["colorless", "colorless"], S: ["snow", "snow"] },
    generico: (n) => `${n} generic`, ou: "or", e: "and", vida: "2 life", xEscolhe: "X (you choose the value)",
    virar: "tap", desvirar: "untap", energia: "energy", meio: "half",
  },
  es: {
    pular: "Saltar al contenido", voltar: "Volver", trocarIdioma: "Cambiar idioma",
    buscarTitulo: "¿Qué carta quieres leer?", campoRotulo: "Nombre de la carta", buscar: "Buscar",
    buscaDica: "Escribe 2 letras o más. Puede ser en inglés o español.",
    sugestoesRotulo: "Sugerencias", nSugestoes: (n) => n === 1 ? "1 sugerencia. Usa las flechas para elegir." : `${n} sugerencias. Usa las flechas para elegir.`,
    semSugestao: "No hay sugerencias para ese nombre.",
    recentes: "Leídas recientemente", recentesVazio: "Las cartas que abras quedan aquí y se abren incluso sin internet.",
    breveTitulo: "Próximamente", breveVoz: "Decir el nombre de la carta", breveCamera: "Apuntar la cámara a la carta",
    carregando: "Cargando la carta…", naoEncontrada: "No encontré una carta con ese nombre. Revisa la ortografía o prueba en inglés.",
    semInternet: "Sin internet. Las cartas que ya abriste siguen en “Leídas recientemente”.",
    erroGeral: "No pude conectar con Scryfall ahora. Inténtalo de nuevo en unos segundos.",
    digiteMais: "Escribe al menos 2 letras.",
    custo: "Coste", semCusto: "Esta carta no tiene coste de maná.", valorTotal: (n) => `Valor total: ${n}`,
    texto: "Texto de la carta", forca: "Fuerza y resistencia", lealdade: "Lealtad",
    palavrasChave: "Palabras clave", imagemOriginal: "Imagen original de la carta",
    mostrarImagem: "Mostrar imagen original", esconderImagem: "Ocultar imagen original",
    ilustracao: (a) => `Ilustración: ${a}`, avisoIngles: "Esta carta aún no tiene versión en portugués. El texto está en inglés.",
    avisoInglesEs: "Esta carta aún no tiene versión en español. El texto está en inglés.",
    creditos: (a) => `Imagen y datos: Scryfall. Ilustración de ${a}. ™ y © Wizards of the Coast.`, verScryfall: "Ver en Scryfall",
    ouvir: "Escuchar la carta", ler: "Leer en voz alta", pausar: "Pausar", continuar: "Continuar", parar: "Detener",
    velocidade: "Velocidad de la voz", lendo: "Leyendo la carta en voz alta.", pausado: "Lectura en pausa.", parado: "Lectura detenida.",
    semVoz: "Este navegador no puede leer en voz alta.",
    forcaFala: (p, r) => `Fuerza ${p}, resistencia ${r}.`, faces: (n) => `Cara ${n}`,
    glossarioTitulo: "Glosario", glossarioIntro: "Palabras clave de las cartas, explicadas en pocas palabras.",
    glossarioFiltro: "Buscar palabra", nTermos: (n) => n === 1 ? "1 palabra" : `${n} palabras`, conteudoEmPt: "Por ahora, este contenido está solo en portugués.",
    ajustesTitulo: "Lectura y ajustes", previa: "Vista previa", previaCusto: "2 de cualquier tipo y 1 azul", previaTexto: "Vuela. Cuando esta criatura entre, roba una carta.",
    leitura: "Modo de lectura", tamanho: "Tamaño de letra", tam1: "normal", tam2: "grande", tam3: "mayor", tam4: "máximo",
    espacamento: "Espaciado", esp1: "Normal", esp2: "Amplio", esp3: "Extra",
    contraste: "Contraste máximo", contrasteDesc: "Fondo más oscuro y letras más claras, sin tonos intermedios.",
    aparencia: "Apariencia", tema: "Tema", temaSistema: "Del dispositivo", temaClaro: "Claro", temaEscuro: "Oscuro",
    animacoes: "Animaciones", animacoesDesc: "Transiciones suaves entre pantallas.",
    animacoesTravadas: "Desactivadas porque tu dispositivo pide menos movimiento.",
    paleta: "Paleta de colores (solo en el prototipo)", paletaDesc: "Elige qué paleta pasará a la app.",
    idioma: "Idioma de la app", cancelar: "Cancelar", confirmar: "Confirmar",
    ajudaTitulo: "Antes de usar", ajudaIntro: "Lo que puede cambiar de un dispositivo a otro.",
    navPrincipal: "Principal", abaBuscar: "Buscar", abaGlossario: "Glosario", abaAjustes: "Lectura", abaAjuda: "Antes de usar",
    voltarTopo: "Volver arriba", idiomaTrocado: "Idioma cambiado a español.",
    tituloBuscar: "Buscar carta", tituloGlossario: "Glosario", tituloAjustes: "Lectura y ajustes", tituloAjuda: "Antes de usar",
    cores: { W: ["blanco", "blancos"], U: ["azul", "azules"], B: ["negro", "negros"], R: ["rojo", "rojos"], G: ["verde", "verdes"], C: ["incoloro", "incoloros"], S: ["nevado", "nevados"] },
    generico: (n) => `${n} de cualquier tipo`, ou: "o", e: "y", vida: "2 vidas", xEscolhe: "X (tú eliges el valor)",
    virar: "girar", desvirar: "enderezar", energia: "energía", meio: "medio",
  },
};

const IDIOMAS = {
  pt: { nome: "Português", sigla: "PT", html: "pt-BR", scryfall: "pt", voz: "pt-BR" },
  en: { nome: "English", sigla: "EN", html: "en", scryfall: "en", voz: "en-US" },
  es: { nome: "Español", sigla: "ES", html: "es", scryfall: "es", voz: "es-ES" },
};

const GLOSSARIO = [
  { id: "flying", pt: "Voar", es: "Vuela", en: "Flying", explica: "Só pode ser bloqueada por criaturas que também voam ou que têm alcance." },
  { id: "reach", pt: "Alcance", es: "Alcance", en: "Reach", explica: "Pode bloquear criaturas que voam." },
  { id: "trample", pt: "Atropelar", es: "Arrollar", en: "Trample", explica: "Se for bloqueada, o dano que sobrar depois de derrotar quem bloqueou vai para o jogador." },
  { id: "deathtouch", pt: "Toque mortífero", es: "Toque mortal", en: "Deathtouch", explica: "Qualquer quantidade de dano que ela causa a uma criatura já é suficiente para destruí-la." },
  { id: "lifelink", pt: "Vínculo com a vida", es: "Vínculo vital", en: "Lifelink", explica: "Quando causa dano, você ganha a mesma quantidade de vida." },
  { id: "haste", pt: "Ímpeto", es: "Prisa", en: "Haste", explica: "Pode atacar e usar habilidades de virar no mesmo turno em que entra." },
  { id: "vigilance", pt: "Vigilância", es: "Vigilancia", en: "Vigilance", explica: "Atacar não faz esta criatura virar. Ela continua pronta para bloquear." },
  { id: "first strike", pt: "Iniciativa", es: "Dañar primero", en: "First strike", explica: "Causa dano de combate antes das criaturas sem iniciativa." },
  { id: "double strike", pt: "Golpe duplo", es: "Dañar dos veces", en: "Double strike", explica: "Causa dano de combate duas vezes: uma junto com iniciativa e outra no dano normal." },
  { id: "menace", pt: "Ameaçar", es: "Amenaza", en: "Menace", explica: "Só pode ser bloqueada por duas criaturas ou mais." },
  { id: "hexproof", pt: "Resistência a magia", es: "Antimaleficio", en: "Hexproof", explica: "Os oponentes não podem escolher esta carta como alvo." },
  { id: "indestructible", pt: "Indestrutível", es: "Indestructible", en: "Indestructible", explica: "Não é destruída por dano nem por efeitos que dizem “destrua”." },
  { id: "defender", pt: "Defensor", es: "Defensor", en: "Defender", explica: "Não pode atacar. Serve para bloquear." },
  { id: "flash", pt: "Lampejo", es: "Destello", en: "Flash", explica: "Pode ser jogada a qualquer momento em que você poderia jogar uma mágica instantânea." },
  { id: "scry", pt: "Vidência", es: "Adivinar", en: "Scry", explica: "Olhe as cartas do topo do seu grimório e escolha quais ficam em cima e quais vão para o fundo." },
  { id: "equip", pt: "Equipar", es: "Equipar", en: "Equip", explica: "Pague o custo para prender este equipamento a uma criatura sua." },
  { id: "enchant", pt: "Encantar", es: "Encantar", en: "Enchant", explica: "Diz a que tipo de coisa esta aura fica presa." },
  { id: "fight", pt: "Lutar", es: "Luchar", en: "Fight", explica: "Duas criaturas causam dano uma à outra, igual à força de cada uma." },
];

const armazenamento = {
  ler(chave, padrao) {
    try {
      const valor = localStorage.getItem("manavai:" + chave);
      return valor === null ? padrao : JSON.parse(valor);
    } catch { return padrao; }
  },
  gravar(chave, valor) {
    try { localStorage.setItem("manavai:" + chave, JSON.stringify(valor)); } catch { }
  },
};

const estado = {
  idioma: armazenamento.ler("idioma", (navigator.language || "pt").slice(0, 2) in IDIOMAS ? (navigator.language || "pt").slice(0, 2) : "pt"),
  tema: armazenamento.ler("tema", "sistema"),
  tamanho: armazenamento.ler("tamanho", "1"),
  espaco: armazenamento.ler("espaco", "1"),
  contraste: armazenamento.ler("contraste", false),
  animacoes: armazenamento.ler("animacoes", true),
  paleta: armazenamento.ler("paleta", "floresta"),
  velocidade: armazenamento.ler("velocidade", 1),
  primeiraRota: true,
};

const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];
const t = (chave, ...args) => {
  const valor = TEXTOS[estado.idioma][chave] ?? TEXTOS.pt[chave];
  return typeof valor === "function" ? valor(...args) : valor;
};
const escapar = (texto = "") => String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const prefereMenosMovimento = matchMedia("(prefers-reduced-motion: reduce)");
const prefereEscuro = matchMedia("(prefers-color-scheme: dark)");
const animacoesLigadas = () => estado.animacoes && !prefereMenosMovimento.matches;

function anunciar(texto) {
  const regiao = $("#anuncio");
  regiao.textContent = "";
  setTimeout(() => { regiao.textContent = texto; }, 60);
}

let ultimaRequisicao = 0;
async function chamarApi(caminho, sinal) {
  const espera = Math.max(0, ultimaRequisicao + 110 - Date.now());
  if (espera) await new Promise((r) => setTimeout(r, espera));
  ultimaRequisicao = Date.now();
  const resposta = await fetch(API + caminho, { headers: { Accept: "application/json" }, signal: sinal });
  if (resposta.status === 404) return null;
  if (!resposta.ok) throw new Error("api " + resposta.status);
  return resposta.json();
}

function partesSimbolo(simbolo) {
  const s = simbolo.toUpperCase();
  const cores = t("cores");
  if (/^\d+$/.test(s)) return { tipo: "generico", n: Number(s) };
  if (s === "X" || s === "Y" || s === "Z") return { tipo: "x", letra: s };
  if (s === "T") return { tipo: "palavra", texto: t("virar") };
  if (s === "Q") return { tipo: "palavra", texto: t("desvirar") };
  if (s === "E") return { tipo: "palavra", texto: t("energia") };
  if (s === "½") return { tipo: "palavra", texto: t("meio") };
  if (cores[s]) return { tipo: "cor", cor: s };
  const partes = s.split("/");
  if (partes.length >= 2) {
    const opcoes = partes.map((p) => {
      if (p === "P") return t("vida");
      if (/^\d+$/.test(p)) return t("generico", p);
      return cores[p] ? "1 " + cores[p][0] : p;
    });
    return { tipo: "hibrido", texto: opcoes.join(` ${t("ou")} `) };
  }
  return { tipo: "palavra", texto: s };
}

function juntar(lista) {
  if (lista.length <= 1) return lista.join("");
  return lista.slice(0, -1).join(", ") + ` ${t("e")} ` + lista[lista.length - 1];
}

function simbolosEmPalavras(sequencia) {
  const simbolos = [...sequencia.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
  let generico = 0;
  const contagem = {};
  const extras = [];
  const palavras = [];
  for (const simbolo of simbolos) {
    const parte = partesSimbolo(simbolo);
    if (parte.tipo === "generico") generico += parte.n;
    else if (parte.tipo === "cor") contagem[parte.cor] = (contagem[parte.cor] || 0) + 1;
    else if (parte.tipo === "x") extras.push(parte.letra === "X" ? t("xEscolhe") : parte.letra);
    else if (parte.tipo === "hibrido") extras.push(parte.texto);
    else palavras.push(parte.texto);
  }
  const itens = [...extras];
  if (generico) itens.push(t("generico", generico));
  for (const [cor, n] of Object.entries(contagem)) itens.push(`${n} ${t("cores")[cor][n > 1 ? 1 : 0]}`);
  return juntar([...palavras, ...itens]);
}

function textoComPalavras(texto) {
  return texto.replace(/(\{[^}]+\})+/g, (grupo) => `[${simbolosEmPalavras(grupo)}]`);
}

function textoComPalavrasHtml(texto) {
  return escapar(texto).replace(/(\{[^}]+\})+/g, (grupo) => `<span class="simbolo-texto">[${escapar(simbolosEmPalavras(grupo))}]</span>`);
}

function imagensSimbolos(custo) {
  return [...custo.matchAll(/\{([^}]+)\}/g)]
    .map((m) => `<img src="${SIMBOLOS_URL}${encodeURIComponent(m[1].replace("/", ""))}.svg" alt="" width="28" height="28" loading="lazy">`)
    .join("");
}

function faces(carta) {
  if (carta.card_faces && carta.card_faces.length) {
    return carta.card_faces.map((face) => ({
      nome: face.printed_name || face.name,
      tipo: face.printed_type_line || face.type_line || "",
      custo: face.mana_cost || "",
      texto: face.printed_text || face.oracle_text || "",
      sabor: face.flavor_text || "",
      forca: face.power, resistencia: face.toughness, lealdade: face.loyalty,
      artista: face.artist || carta.artist,
      imagem: face.image_uris?.normal || null,
    }));
  }
  return [{
    nome: carta.printed_name || carta.name,
    tipo: carta.printed_type_line || carta.type_line || "",
    custo: carta.mana_cost || "",
    texto: carta.printed_text || carta.oracle_text || "",
    sabor: carta.flavor_text || "",
    forca: carta.power, resistencia: carta.toughness, lealdade: carta.loyalty,
    artista: carta.artist,
    imagem: carta.image_uris?.normal || null,
  }];
}

async function buscarCarta(nome) {
  const idiomaCarta = IDIOMAS[estado.idioma].scryfall;
  const chave = `${nome.toLowerCase()}|${idiomaCarta}`;
  const cache = armazenamento.ler("cartas", {});
  if (cache[chave] && Date.now() - cache[chave].quando < 7 * 864e5) return cache[chave].carta;
  if (!navigator.onLine && cache[chave]) return cache[chave].carta;

  const base = await chamarApi(`/cards/named?fuzzy=${encodeURIComponent(nome)}`);
  if (!base) return null;
  let carta = base;
  if (idiomaCarta !== "en") {
    try {
      const busca = await chamarApi(`/cards/search?q=${encodeURIComponent(`!"${base.name}" lang:${idiomaCarta}`)}&unique=prints&include_multilingual=true`);
      const traduzida = busca?.data?.find((c) => c.printed_text || c.card_faces?.some((f) => f.printed_text)) || busca?.data?.[0];
      if (traduzida) carta = { ...traduzida, keywords: base.keywords };
    } catch { }
  }
  const resumo = {
    nomeBusca: base.name, lang: carta.lang, keywords: carta.keywords || [], cmc: carta.cmc ?? base.cmc ?? 0,
    scryfall: carta.scryfall_uri, faces: faces(carta), imagemUnica: carta.image_uris?.normal || null,
  };
  cache[chave] = { quando: Date.now(), carta: resumo };
  const chaves = Object.keys(cache);
  if (chaves.length > 40) delete cache[chaves[0]];
  armazenamento.gravar("cartas", cache);
  return resumo;
}

function lembrarRecente(carta) {
  const recentes = armazenamento.ler("recentes", []).filter((r) => r.nome !== carta.nomeBusca);
  recentes.unshift({ nome: carta.nomeBusca, exibido: carta.faces.map((f) => f.nome).join(" // "), tipo: carta.faces[0].tipo });
  armazenamento.gravar("recentes", recentes.slice(0, 8));
}

function desenharRecentes() {
  const recentes = armazenamento.ler("recentes", []);
  $("#lista-recentes").innerHTML = recentes.map((r) => `
    <li><a href="#/carta/${encodeURIComponent(r.nome)}">
      <span class="recente-nome">${escapar(r.exibido)}<span class="recente-tipo">${escapar(r.tipo)}</span></span>
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
    </a></li>`).join("");
  $("#recentes-vazio").hidden = recentes.length > 0;
}

const combo = {
  campo: null, lista: null, itens: [], ativo: -1, controle: null, espera: null,
  iniciar() {
    this.campo = $("#campo-busca");
    this.lista = $("#sugestoes");
    this.campo.addEventListener("input", () => this.digitou());
    this.campo.addEventListener("keydown", (e) => this.tecla(e));
    this.campo.addEventListener("blur", () => setTimeout(() => this.fechar(), 150));
    this.lista.addEventListener("mousedown", (e) => e.preventDefault());
    this.lista.addEventListener("click", (e) => {
      const item = e.target.closest("[role=option][data-nome]");
      if (item) this.escolher(item.dataset.nome);
    });
    $("#form-busca").addEventListener("submit", (e) => {
      e.preventDefault();
      if (this.ativo >= 0) return this.escolher(this.itens[this.ativo]);
      const nome = this.campo.value.trim();
      if (nome.length < 2) return mostrarStatus(t("digiteMais"));
      this.escolher(nome);
    });
  },
  digitou() {
    clearTimeout(this.espera);
    const termo = this.campo.value.trim();
    if (termo.length < 2) return this.fechar();
    this.espera = setTimeout(() => this.sugerir(termo), 280);
  },
  async sugerir(termo) {
    this.controle?.abort();
    this.controle = new AbortController();
    try {
      const resposta = await chamarApi(`/cards/autocomplete?q=${encodeURIComponent(termo)}&include_extras=false`, this.controle.signal);
      this.mostrar((resposta?.data || []).slice(0, 8), termo);
    } catch (erro) {
      if (erro.name !== "AbortError") mostrarStatus(navigator.onLine ? t("erroGeral") : t("semInternet"));
    }
  },
  mostrar(itens, termo) {
    this.itens = itens;
    this.ativo = -1;
    this.campo.removeAttribute("aria-activedescendant");
    const marcar = (nome) => {
      const i = nome.toLowerCase().indexOf(termo.toLowerCase());
      if (i < 0) return escapar(nome);
      return escapar(nome.slice(0, i)) + "<mark>" + escapar(nome.slice(i, i + termo.length)) + "</mark>" + escapar(nome.slice(i + termo.length));
    };
    this.lista.innerHTML = itens.length
      ? itens.map((nome, i) => `<li role="option" id="sug-${i}" aria-selected="false" data-nome="${escapar(nome)}" lang="en">${marcar(nome)}</li>`).join("")
      : `<li role="option" aria-disabled="true" class="sem-sugestao">${escapar(t("semSugestao"))}</li>`;
    this.lista.hidden = false;
    this.campo.setAttribute("aria-expanded", "true");
    anunciar(itens.length ? t("nSugestoes", itens.length) : t("semSugestao"));
  },
  tecla(e) {
    if (this.lista.hidden) return;
    const total = this.itens.length;
    if (e.key === "ArrowDown" && total) { e.preventDefault(); this.marcar((this.ativo + 1) % total); }
    else if (e.key === "ArrowUp" && total) { e.preventDefault(); this.marcar(this.ativo <= 0 ? total - 1 : this.ativo - 1); }
    else if (e.key === "Escape") { e.preventDefault(); this.fechar(); }
  },
  marcar(i) {
    this.ativo = i;
    $$("[role=option]", this.lista).forEach((el, j) => el.setAttribute("aria-selected", String(j === i)));
    const el = $(`#sug-${i}`);
    this.campo.setAttribute("aria-activedescendant", el.id);
    el.scrollIntoView({ block: "nearest" });
  },
  fechar() {
    this.lista.hidden = true;
    this.ativo = -1;
    this.campo.setAttribute("aria-expanded", "false");
    this.campo.removeAttribute("aria-activedescendant");
  },
  escolher(nome) {
    this.fechar();
    location.hash = `#/carta/${encodeURIComponent(nome)}`;
  },
};

function mostrarStatus(texto) {
  $("#status-busca").textContent = texto;
}

const leitor = {
  falando: false,
  pausado: false,
  disponivel: "speechSynthesis" in window,
  textoDaCarta(carta) {
    const linhas = [];
    carta.faces.forEach((f, i) => {
      if (carta.faces.length > 1) linhas.push(t("faces", i + 1) + ".");
      linhas.push(f.nome + ".");
      linhas.push(f.custo ? `${t("custo")}: ${simbolosEmPalavras(f.custo)}.` : t("semCusto"));
      linhas.push(f.tipo + ".");
      if (f.texto) linhas.push(textoComPalavras(f.texto).replace(/[[\]]/g, ""));
      if (f.forca !== undefined) linhas.push(t("forcaFala", f.forca, f.resistencia));
    });
    return linhas.join(" ");
  },
  falar(carta) {
    if (!this.disponivel) return;
    speechSynthesis.cancel();
    const fala = new SpeechSynthesisUtterance(this.textoDaCarta(carta));
    fala.lang = carta.lang === "en" ? "en-US" : IDIOMAS[estado.idioma].voz;
    fala.rate = Number(estado.velocidade);
    fala.onend = () => { this.falando = false; this.pausado = false; this.atualizar(); };
    fala.onerror = fala.onend;
    speechSynthesis.speak(fala);
    this.falando = true;
    this.pausado = false;
    this.atualizar();
    anunciar(t("lendo"));
  },
  alternar(carta) {
    if (!this.falando) return this.falar(carta);
    if (this.pausado) { speechSynthesis.resume(); this.pausado = false; anunciar(t("lendo")); }
    else { speechSynthesis.pause(); this.pausado = true; anunciar(t("pausado")); }
    this.atualizar();
  },
  parar(silencioso) {
    if (!this.disponivel) return;
    speechSynthesis.cancel();
    const estava = this.falando;
    this.falando = false;
    this.pausado = false;
    this.atualizar();
    if (estava && !silencioso) anunciar(t("parado"));
  },
  atualizar() {
    const botao = $("#botao-ler");
    if (!botao) return;
    const rotulo = !this.falando ? t("ler") : this.pausado ? t("continuar") : t("pausar");
    $("span", botao).textContent = rotulo;
    $("svg", botao).innerHTML = this.falando && !this.pausado
      ? '<path d="M8 5v14M16 5v14"/>'
      : '<path d="M7 4.5v15l12-7.5z"/>';
    $("#botao-parar").disabled = !this.falando;
  },
};

async function abrirCarta(nome) {
  const area = $("#carta-conteudo");
  leitor.parar(true);
  area.innerHTML = `<h1 id="t-carta" class="titulo-tela" tabindex="-1">${escapar(t("carregando"))}</h1><div class="carregando" aria-hidden="true"><span></span><span></span><span></span></div>`;
  let carta;
  try {
    carta = await buscarCarta(nome);
  } catch {
    carta = undefined;
  }
  if (carta === null || carta === undefined) {
    const mensagem = carta === null ? t("naoEncontrada") : (navigator.onLine ? t("erroGeral") : t("semInternet"));
    area.innerHTML = `<h1 id="t-carta" class="titulo-tela" tabindex="-1">${escapar(nome)}</h1><p class="status">${escapar(mensagem)}</p><a class="botao botao-secundario" href="#/buscar">${escapar(t("voltar"))}</a>`;
    focarTitulo();
    return;
  }
  lembrarRecente(carta);
  desenharCarta(carta);
  document.title = `${carta.faces.map((f) => f.nome).join(" // ")} · Mana Vai`;
  focarTitulo();
}

function desenharCarta(carta) {
  const emIngles = carta.lang === "en" && estado.idioma !== "en";
  const langTexto = carta.lang === "en" ? "en" : IDIOMAS[estado.idioma].html;
  const nomeCompleto = carta.faces.map((f) => f.nome).join(" // ");
  const imagens = carta.imagemUnica ? [{ src: carta.imagemUnica, artista: carta.faces[0].artista }] : carta.faces.filter((f) => f.imagem).map((f) => ({ src: f.imagem, artista: f.artista }));
  const palavras = carta.keywords
    .map((k) => GLOSSARIO.find((g) => g.id === k.toLowerCase()))
    .filter(Boolean);

  const htmlFace = (f, i) => `
    <div class="face" ${langTexto !== IDIOMAS[estado.idioma].html ? `lang="${langTexto}"` : ""}>
      ${carta.faces.length > 1 ? `<h3 class="titulo-bloco">${escapar(t("faces", i + 1))}: ${escapar(f.nome)}</h3>` : ""}
      <div class="texto-regras">
        ${f.texto ? f.texto.split("\n").map((linha) => `<p>${textoComPalavrasHtml(linha)}</p>`).join("") : ""}
        ${f.sabor ? `<p class="texto-sabor">${escapar(f.sabor)}</p>` : ""}
      </div>
      ${f.forca !== undefined ? `<p class="forca"><span class="sr-only">${escapar(t("forca"))}: </span>${escapar(f.forca)} / ${escapar(f.resistencia)}</p>` : ""}
      ${f.lealdade !== undefined ? `<p class="forca">${escapar(t("lealdade"))}: ${escapar(f.lealdade)}</p>` : ""}
    </div>`;

  const htmlCusto = carta.faces.filter((f) => f.custo).map((f) => `
      ${carta.faces.length > 1 ? `<p class="custo-total">${escapar(f.nome)}</p>` : ""}
      <p class="custo-palavras">${escapar(simbolosEmPalavras(f.custo))}</p>
      <div class="custo-simbolos" aria-hidden="true">${imagensSimbolos(f.custo)}</div>`).join("");

  $("#carta-conteudo").innerHTML = `
    <article class="carta" aria-labelledby="t-carta">
      <div class="carta-cabeca">
        <h1 id="t-carta" class="titulo-tela" tabindex="-1" ${langTexto !== IDIOMAS[estado.idioma].html ? `lang="${langTexto}"` : ""}>${escapar(nomeCompleto)}</h1>
        <p class="carta-tipo" ${langTexto !== IDIOMAS[estado.idioma].html ? `lang="${langTexto}"` : ""}>${escapar(carta.faces.map((f) => f.tipo).join(" // "))}</p>
      </div>

      ${emIngles && t(estado.idioma === "es" ? "avisoInglesEs" : "avisoIngles") ? `<p class="aviso-idioma">${escapar(t(estado.idioma === "es" ? "avisoInglesEs" : "avisoIngles"))}</p>` : ""}

      <section class="leitor" aria-labelledby="t-ouvir">
        <h2 id="t-ouvir" class="sr-only">${escapar(t("ouvir"))}</h2>
        ${leitor.disponivel ? `
        <div class="leitor-botoes">
          <button type="button" class="botao botao-primario" id="botao-ler"><svg aria-hidden="true" viewBox="0 0 24 24"></svg><span></span></button>
          <button type="button" class="botao botao-secundario" id="botao-parar"><svg aria-hidden="true" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg><span>${escapar(t("parar"))}</span></button>
        </div>
        <div class="velocidade">
          <label for="velocidade" class="rotulo">${escapar(t("velocidade"))}</label>
          <div class="velocidade-linha">
            <input type="range" id="velocidade" min="0.5" max="2" step="0.25" value="${estado.velocidade}" aria-valuetext="${estado.velocidade}x">
            <output for="velocidade" id="velocidade-valor">${estado.velocidade}x</output>
          </div>
        </div>` : `<p>${escapar(t("semVoz"))}</p>`}
      </section>

      <div class="carta-corpo">
        <section class="carta-imagem" aria-labelledby="t-imagem">
          <h2 id="t-imagem" class="sr-only">${escapar(t("imagemOriginal"))}</h2>
          <button type="button" class="botao botao-secundario alternar-imagem" id="alternar-imagem" aria-expanded="true" aria-controls="figuras">${escapar(t("esconderImagem"))}</button>
          <div id="figuras">
          ${imagens.map((img, i) => `
            <figure>
              <img src="${escapar(img.src)}" alt="${escapar(t("imagemOriginal"))}: ${escapar(carta.faces[i]?.nome || nomeCompleto)}" width="488" height="680" loading="eager">
              <figcaption>${escapar(t("ilustracao", img.artista || ""))}</figcaption>
            </figure>`).join("")}
          </div>
        </section>

        <div class="bloco">
          <section class="painel" aria-labelledby="t-custo">
            <h2 id="t-custo">${escapar(t("custo"))}</h2>
            ${htmlCusto || `<p class="custo-palavras">${escapar(t("semCusto"))}</p>`}
            <p class="custo-total">${escapar(t("valorTotal", carta.cmc))}</p>
          </section>

          <section class="painel" aria-labelledby="t-texto">
            <h2 id="t-texto">${escapar(t("texto"))}</h2>
            ${carta.faces.map(htmlFace).join("")}
          </section>

          ${palavras.length ? `
          <section class="painel" aria-labelledby="t-chave">
            <h2 id="t-chave">${escapar(t("palavrasChave"))}</h2>
            <ul class="chips">
              ${palavras.map((g) => `<li><a href="#/glossario/${encodeURIComponent(g.id)}"><span class="link-texto">${escapar(g[estado.idioma] || g.pt)}</span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></a></li>`).join("")}
            </ul>
          </section>` : ""}

          <p class="creditos">${escapar(t("creditos", carta.faces[0].artista || ""))} <a href="${escapar(carta.scryfall)}" target="_blank" rel="noopener noreferrer"><span class="link-texto">${escapar(t("verScryfall"))}</span><span class="sr-only"> (${estado.idioma === "en" ? "opens in a new tab" : estado.idioma === "es" ? "se abre en una pestaña nueva" : "abre em nova aba"})</span></a></p>
        </div>
      </div>
    </article>`;

  if (leitor.disponivel) {
    leitor.atualizar();
    $("#botao-ler").addEventListener("click", () => leitor.alternar(carta));
    $("#botao-parar").addEventListener("click", () => leitor.parar());
    const faixa = $("#velocidade");
    faixa.addEventListener("input", () => {
      estado.velocidade = faixa.value;
      faixa.setAttribute("aria-valuetext", faixa.value + "x");
      $("#velocidade-valor").textContent = faixa.value + "x";
      armazenamento.gravar("velocidade", faixa.value);
    });
    faixa.addEventListener("change", () => { if (leitor.falando) leitor.falar(carta); });
  }
  $("#alternar-imagem").addEventListener("click", (e) => {
    const secao = $(".carta-imagem");
    const recolher = !secao.hasAttribute("data-recolhida");
    secao.toggleAttribute("data-recolhida", recolher);
    e.currentTarget.setAttribute("aria-expanded", String(!recolher));
    e.currentTarget.textContent = recolher ? t("mostrarImagem") : t("esconderImagem");
  });
  prepararSetaTopo();
}

function desenharGlossario(filtro = "") {
  const termo = filtro.trim().toLowerCase();
  const itens = GLOSSARIO.filter((g) => !termo || [g.pt, g.en, g.es, g.explica].some((v) => v.toLowerCase().includes(termo)));
  $("#lista-glossario").innerHTML = itens.map((g) => `
    <details class="termo" id="termo-${g.id.replace(/\s/g, "-")}">
      <summary>
        <span lang="${IDIOMAS[estado.idioma].html}">${escapar(g[estado.idioma] || g.pt)}</span>
        <span class="termo-original" lang="en">${estado.idioma === "en" ? "" : escapar(g.en)}</span>
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
      </summary>
      <p class="termo-explica" lang="pt-BR">${escapar(g.explica)}</p>
    </details>`).join("");
  $("#glossario-contagem").textContent = t("nTermos", itens.length);
  $("#glossario-aviso-idioma").hidden = estado.idioma === "pt";
}

const seta = {
  botao: null, observador: null, visivel: false,
  iniciar() {
    this.botao = $("#seta-topo");
    this.botao.hidden = false;
    this.botao.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: animacoesLigadas() ? "smooth" : "auto" });
      const titulo = $(".tela:not([hidden]) h1");
      if (titulo) { titulo.setAttribute("tabindex", "-1"); titulo.focus({ preventScroll: true }); }
      this.mostrar(false);
    });
    window.addEventListener("scroll", () => { if (window.scrollY < 80) this.mostrar(false); }, { passive: true });
  },
  mostrar(sim) {
    if (sim === this.visivel) return;
    this.visivel = sim;
    this.botao.classList.toggle("visivel", sim);
  },
};

function prepararSetaTopo() {
  seta.observador?.disconnect();
  $$(".fim-secao").forEach((el) => el.remove());
  const tela = $(".tela:not([hidden])");
  if (!tela) return;
  const secoes = $$(".bloco, .painel, .cartao-ajuda, .lista-glossario", tela);
  seta.observador = new IntersectionObserver((entradas) => {
    if (entradas.some((e) => e.isIntersecting) && window.scrollY > 300) seta.mostrar(true);
  }, { rootMargin: "0px 0px -15% 0px" });
  secoes.forEach((secao) => {
    const marca = document.createElement("span");
    marca.className = "fim-secao";
    marca.setAttribute("aria-hidden", "true");
    secao.append(marca);
    seta.observador.observe(marca);
  });
}

function aplicarTextos() {
  document.documentElement.lang = IDIOMAS[estado.idioma].html;
  $$("[data-t]").forEach((el) => { el.textContent = t(el.dataset.t); });
  $$("[data-t-label]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.tLabel)));
  $("#idioma-atual").textContent = IDIOMAS[estado.idioma].sigla;
  $("#idioma-nome").textContent = IDIOMAS[estado.idioma].nome;
  $("#ajuda-aviso-idioma").hidden = estado.idioma === "pt";
  atualizarChaveAnimacoes();
}

function aplicarAparencia() {
  const raiz = document.documentElement;
  const tema = estado.tema === "sistema" ? (prefereEscuro.matches ? "escuro" : "claro") : estado.tema;
  raiz.dataset.tema = tema;
  raiz.dataset.paleta = estado.paleta;
  raiz.dataset.tamanho = estado.tamanho;
  raiz.dataset.espaco = estado.espaco;
  raiz.dataset.contraste = estado.contraste ? "alto" : "normal";
  raiz.dataset.animacoes = animacoesLigadas() ? "on" : "off";
  $('meta[name="theme-color"]').content = getComputedStyle(raiz).getPropertyValue("--fundo").trim();
  $("#chave-contraste").setAttribute("aria-pressed", String(estado.contraste));
  atualizarChaveAnimacoes();
}

function atualizarChaveAnimacoes() {
  const chave = $("#chave-animacoes");
  const travada = prefereMenosMovimento.matches;
  chave.disabled = travada;
  chave.setAttribute("aria-pressed", String(animacoesLigadas()));
  $("#d-animacoes").textContent = travada ? t("animacoesTravadas") : t("animacoesDesc");
}

function iniciarAjustes() {
  ["tema", "tamanho", "espaco", "paleta"].forEach((nome) => {
    $$(`input[name="${nome}"]`).forEach((input) => {
      input.checked = String(estado[nome]) === input.value;
      input.addEventListener("change", () => {
        estado[nome] = input.value;
        armazenamento.gravar(nome, input.value);
        aplicarAparencia();
      });
    });
  });
  $("#chave-contraste").addEventListener("click", () => {
    estado.contraste = !estado.contraste;
    armazenamento.gravar("contraste", estado.contraste);
    aplicarAparencia();
  });
  $("#chave-animacoes").addEventListener("click", () => {
    if (prefereMenosMovimento.matches) return;
    estado.animacoes = !estado.animacoes;
    armazenamento.gravar("animacoes", estado.animacoes);
    aplicarAparencia();
  });
  prefereMenosMovimento.addEventListener("change", aplicarAparencia);
  prefereEscuro.addEventListener("change", aplicarAparencia);
}

function iniciarIdioma() {
  const folha = $("#folha-idioma");
  let origem = null;
  const abrir = (e) => {
    origem = e.currentTarget;
    $$('input[name="idioma"]', folha).forEach((i) => { i.checked = i.value === estado.idioma; });
    folha.showModal();
    $('input[name="idioma"]:checked', folha)?.focus();
  };
  $("#abrir-idioma").addEventListener("click", abrir);
  $("#abrir-idioma-ajustes").addEventListener("click", abrir);
  folha.addEventListener("click", (e) => { if (e.target === folha) folha.close("cancelar"); });
  folha.addEventListener("close", () => {
    if (folha.returnValue === "confirmar") {
      const escolhido = $('input[name="idioma"]:checked', folha)?.value;
      if (escolhido && escolhido !== estado.idioma) {
        estado.idioma = escolhido;
        armazenamento.gravar("idioma", escolhido);
        aplicarTextos();
        desenharGlossario($("#filtro-glossario").value);
        anunciar(t("idiomaTrocado"));
        rotear(true);
      }
    }
    origem?.focus();
  });
}

const TITULOS = { buscar: "tituloBuscar", glossario: "tituloGlossario", ajustes: "tituloAjustes", ajuda: "tituloAjuda" };

function focarTitulo() {
  if (estado.primeiraRota) { estado.primeiraRota = false; return; }
  const titulo = $(".tela:not([hidden]) h1");
  if (!titulo) return;
  titulo.setAttribute("tabindex", "-1");
  titulo.focus({ preventScroll: true });
}

function rotear(manterFoco) {
  const [, rota = "buscar", parametro] = location.hash.split("/");
  const nomeRota = ["buscar", "carta", "glossario", "ajustes", "ajuda"].includes(rota) ? rota : "buscar";
  if (nomeRota !== "carta") leitor.parar(true);
  seta.mostrar(false);

  $$(".tela").forEach((tela) => {
    const ativa = tela.dataset.rota === nomeRota;
    tela.hidden = !ativa;
    tela.classList.toggle("entrando", ativa);
  });
  $$(".abas a").forEach((a) => {
    const atual = a.dataset.aba === nomeRota || (nomeRota === "carta" && a.dataset.aba === "buscar");
    if (atual) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  $("#voltar").hidden = nomeRota !== "carta";
  window.scrollTo(0, 0);

  if (nomeRota === "carta" && parametro) {
    abrirCarta(decodeURIComponent(parametro));
    return;
  }
  document.title = `${t(TITULOS[nomeRota])} · Mana Vai`;
  if (nomeRota === "buscar") desenharRecentes();
  prepararSetaTopo();

  if (nomeRota === "glossario" && parametro) {
    const alvo = $(`#termo-${decodeURIComponent(parametro).replace(/\s/g, "-")}`);
    if (alvo) {
      $$(".termo.destaque").forEach((el) => el.classList.remove("destaque"));
      alvo.open = true;
      alvo.classList.add("destaque");
      alvo.scrollIntoView({ block: "start" });
      $("summary", alvo).focus({ preventScroll: true });
      estado.primeiraRota = false;
      return;
    }
  }
  if (!manterFoco) focarTitulo();
}

function iniciar() {
  aplicarAparencia();
  aplicarTextos();
  iniciarAjustes();
  iniciarIdioma();
  combo.iniciar();
  seta.iniciar();
  desenharGlossario();
  $("#filtro-glossario").addEventListener("input", (e) => { desenharGlossario(e.target.value); prepararSetaTopo(); });
  $("#voltar").addEventListener("click", () => {
    if (history.length > 1 && sessionStorage.getItem("manavai:navegou")) history.back();
    else location.hash = "#/buscar";
  });
  window.addEventListener("hashchange", () => {
    try { sessionStorage.setItem("manavai:navegou", "1"); } catch { }
    rotear();
  });
  window.addEventListener("online", () => mostrarStatus(""));
  rotear();
}

iniciar();
