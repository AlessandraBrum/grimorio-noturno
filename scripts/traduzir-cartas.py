import collections
import gzip
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DESTINO = RAIZ / 'public' / 'traducoes'
CACHE = RAIZ / 'scripts' / 'dados' / 'traducao-automatica.json'
MODELO = 'Helsinki-NLP/opus-mt-tc-big-en-pt'
PASTA_MODELO = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / 'interno' / 'modelo-traducao'
CABECALHOS = {'User-Agent': 'GrimorioNoturno/1.0', 'Accept': 'application/json'}
LAYOUTS_FORA = {'art_series', 'token', 'double_faced_token', 'emblem', 'planar', 'vanguard', 'scheme', 'front_card'}

LEMBRETE = re.compile(r'\s*\([^)]*\)')
NUMEROS = re.compile(r'\{[^}]+\}|[+-]?\d+/[+-]?\d+|[+-]?\b\d+\b')
SIMBOLOS = re.compile(r'(?:\{[^}]+\})+|~')
DIVISAO = re.compile(r'(?<=[.!?"])\s+(?=[A-Z~"{•—\-+])')

AJUSTES = [
    (r'\b(?:[Ff]eitiço de contra-alvo|[Cc]ontra-alvo feitiço|[Ff]eitiço contra(?:-| )alvo)\b', 'Anule a mágica alvo'),
    (r'\b[Cc]ontra(?:-| )alvo\b', 'Anule'),
    (r'\bdesenhar\b', 'comprar'), (r'\bdesenhe\b', 'compre'), (r'\bdesenha\b', 'compra'),
    (r'\bdesenham\b', 'compram'), (r'\bdesenhou\b', 'comprou'), (r'\bdesenho\b', 'compra'),
    (r'\bum cartão\b', 'um card'), (r'\bcartões\b', 'cards'), (r'\bcartão\b', 'card'),
    (r'\buma carta\b', 'um card'), (r'\bcartas\b', 'cards'), (r'\bcarta\b', 'card'),
    (r'\bsímbolos? de criatura\b', 'ficha de criatura'), (r'\btokens?\b', 'ficha'),
    (r'^Sacrifício\b', 'Sacrifique'), (r'\bGrito\b', 'Vidência'),
    (r'\bVoando\b', 'Voar'), (r'\bvoando\b', 'voar'),
    (r'\bsua vez\b', 'seu turno'), (r'\bsuas vezes\b', 'seus turnos'),
    (r'\bfeitiço\b', 'mágica'), (r'\bfeitiços\b', 'mágicas'),
    (r'\bbatentes\b', 'atacantes'), (r'\bbiblioteca\b', 'grimório'),
    (r'\bSacrifice\b', 'Sacrifique'), (r'\bum ficha\b', 'uma ficha'), (r'\bduas cards\b', 'dois cards'),
    (r'\b(?:[Ee]ste|[Ee]sse) mágica\b', 'esta mágica'), (r'\bum mágica\b', 'uma mágica'), (r'\bo mágica\b', 'a mágica'),
    (r'\bcomo um mágica\b', 'como um feitiço'), (r'\bse apressam\b', 'têm ímpeto'), (r'\bse apressa\b', 'tem ímpeto'),
    (r'\bpressa\b', 'ímpeto'), (r'\blançad([oa]s?)\b', r'conjurad\1'), (r'\blançar\b', 'conjurar'), (r'\blança\b', 'conjura'), (r'\blançou\b', 'conjurou'), (r'\blançam\b', 'conjuram'),
    (r'\b1 pontos\b', '1 ponto'), (r'\bAterragem\b', 'Queda de Terreno'),
]


def pedir(endereco, tentativa=1):
    try:
        with urllib.request.urlopen(urllib.request.Request(endereco, headers=CABECALHOS)) as resposta:
            return resposta.read()
    except urllib.error.HTTPError as erro:
        if erro.code == 429 and tentativa <= 5:
            time.sleep(2 * tentativa)
            return pedir(endereco, tentativa + 1)
        raise


def faces(carta):
    return carta.get('card_faces') or [carta]


def trocar_nome(texto, nome):
    for parte in sorted({nome, nome.split(',')[0]}, key=len, reverse=True):
        if parte and len(parte) > 2:
            texto = texto.replace(parte, '~')
    return texto


def frases(texto):
    return [parte for parte in DIVISAO.split(LEMBRETE.sub('', texto).strip()) if parte]


def generalizar(texto):
    return NUMEROS.sub('§', texto), NUMEROS.findall(texto)


class Memoria:
    def __init__(self):
        self.pares = collections.defaultdict(collections.Counter)

    def guardar(self, ingles, portugues):
        modelo_en, valores_en = generalizar(ingles)
        modelo_pt, valores_pt = generalizar(portugues)
        if valores_en == valores_pt:
            self.pares[modelo_en][modelo_pt] += 1
        else:
            self.pares['=' + ingles][portugues] += 1

    def achar(self, ingles):
        modelo, valores = generalizar(ingles)
        if modelo in self.pares:
            restantes = iter(valores)
            return re.sub('§', lambda _: next(restantes, ''), self.pares[modelo].most_common(1)[0][0])
        if '=' + ingles in self.pares:
            return self.pares['=' + ingles].most_common(1)[0][0]
        return None

    def aprender_linha(self, ingles, portugues):
        lista_en, lista_pt = frases(ingles), frases(portugues)
        if not lista_en or not lista_pt:
            return
        self.guardar(' '.join(lista_en), ' '.join(lista_pt))
        if len(lista_en) == len(lista_pt) > 1:
            for en, pt in zip(lista_en, lista_pt):
                self.guardar(en, pt)
        palavras_en = [parte.strip() for parte in lista_en[0].split(',')]
        palavras_pt = [parte.strip() for parte in lista_pt[0].split(',')]
        if len(lista_en) == 1 and len(palavras_en) == len(palavras_pt) > 1:
            for en, pt in zip(palavras_en, palavras_pt):
                self.guardar(en, pt)


class Tipos:
    def __init__(self):
        self.inteiros = collections.defaultdict(collections.Counter)
        self.principais = collections.defaultdict(collections.Counter)
        self.subtipos = collections.defaultdict(collections.Counter)

    def aprender(self, ingles, portugues):
        self.inteiros[ingles][portugues] += 1
        esquerda_en, _, direita_en = ingles.partition(' — ')
        esquerda_pt, direita_pt = (re.split(r'\s+[—-]\s+', portugues, maxsplit=1) + [''])[:2]
        self.principais[esquerda_en][esquerda_pt] += 1
        sub_en, sub_pt = direita_en.split(), direita_pt.split()
        if sub_en and len(sub_en) == len(sub_pt):
            for en, pt in zip(sub_en, sub_pt):
                self.subtipos[en][pt] += 1

    def traduzir(self, ingles):
        if ingles in self.inteiros:
            return self.inteiros[ingles].most_common(1)[0][0]
        esquerda, _, direita = ingles.partition(' — ')
        if esquerda not in self.principais:
            return None
        resultado = self.principais[esquerda].most_common(1)[0][0]
        if direita:
            subtipos = [self.subtipos[s].most_common(1)[0][0] if s in self.subtipos else s for s in direita.split()]
            resultado += ' — ' + ' '.join(subtipos)
        return resultado


class Tradutor:
    def __init__(self):
        self.cache = json.loads(CACHE.read_text('utf-8')) if CACHE.exists() else {}
        self.pendentes = set()

    def pedir(self, frase):
        if frase not in self.cache:
            self.pendentes.add(frase)

    def traduzir_pendentes(self):
        if not self.pendentes:
            return
        import ctranslate2
        import transformers
        if not (PASTA_MODELO / 'model.bin').exists():
            from ctranslate2.converters import TransformersConverter
            TransformersConverter(MODELO).convert(str(PASTA_MODELO), quantization='int8')
        tokens = transformers.AutoTokenizer.from_pretrained(MODELO)
        motor = ctranslate2.Translator(str(PASTA_MODELO), intra_threads=4)
        lista = sorted(self.pendentes)
        for inicio in range(0, len(lista), 64):
            lote = lista[inicio:inicio + 64]
            entradas, marcas = [], []
            for frase in lote:
                guardados = []

                def marcar(achado):
                    guardados.append(achado.group(0))
                    return f'S{len(guardados)}'

                entradas.append(tokens.convert_ids_to_tokens(tokens.encode('>>por<< ' + SIMBOLOS.sub(marcar, frase))))
                marcas.append(guardados)
            for frase, guardados, saida in zip(lote, marcas, motor.translate_batch(entradas, beam_size=4, max_decoding_length=256)):
                texto = tokens.decode(tokens.convert_tokens_to_ids(saida.hypotheses[0]), skip_special_tokens=True)
                for indice in range(len(guardados), 0, -1):
                    texto = re.sub(rf'S\s?{indice}(?!\d)', lambda _: guardados[indice - 1], texto)
                self.cache[frase] = texto
            print(f'{min(inicio + 64, len(lista))}/{len(lista)} frases traduzidas', flush=True)
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        CACHE.write_text(json.dumps(dict(sorted(self.cache.items())), ensure_ascii=False, indent=0), 'utf-8')

    def resultado(self, frase):
        texto = self.cache[frase]
        for padrao, troca in AJUSTES:
            texto = re.sub(padrao, troca, texto)
        return texto


def baixar_cartas_em_portugues():
    cartas = []
    endereco = 'https://api.scryfall.com/cards/search?q=lang%3Apt&unique=prints&order=released&dir=desc'
    while endereco:
        pagina = json.loads(pedir(endereco))
        cartas.extend(pagina['data'])
        endereco = pagina.get('next_page') if pagina.get('has_more') else None
        time.sleep(0.12)
    return cartas


def baixar_oraculo():
    lista = json.loads(pedir('https://api.scryfall.com/bulk-data'))
    item = next(item for item in lista['data'] if item['type'] == 'oracle_cards')
    bruto = pedir(item.get('jsonl_download_uri') or item['download_uri'])
    texto = (gzip.decompress(bruto) if bruto[:2] == b'\x1f\x8b' else bruto).decode('utf-8').strip()
    return json.loads(texto) if texto.startswith('[') else [json.loads(linha) for linha in texto.splitlines()]


def traduzir_linha(linha, nome, memoria, tradutor, partes):
    limpa = LEMBRETE.sub('', trocar_nome(linha, nome)).strip()
    if not limpa:
        return
    achada = memoria.achar(limpa)
    if achada:
        partes.append(('ok', achada))
        return
    lista = frases(limpa)
    for frase in lista:
        achada = memoria.achar(frase)
        if achada is None:
            palavras = [parte.strip() for parte in frase.split(',')]
            if len(lista) == 1 and len(palavras) > 1 and all(memoria.achar(p) for p in palavras):
                achada = ', '.join(memoria.achar(p) for p in palavras)
        if achada is None:
            tradutor.pedir(frase)
            partes.append(('auto', frase))
        else:
            partes.append(('ok', achada))


def main():
    print('Baixando cartas em português...', flush=True)
    em_portugues = baixar_cartas_em_portugues()
    print('Baixando o Oracle...', flush=True)
    oraculo = baixar_oraculo()

    memoria, tipos, com_edicao = Memoria(), Tipos(), set()
    for carta in em_portugues:
        com_edicao.add(carta.get('oracle_id') or faces(carta)[0].get('oracle_id'))
        for face in faces(carta):
            if face.get('type_line') and face.get('printed_type_line'):
                tipos.aprender(face['type_line'], face['printed_type_line'])
            ingles = (face.get('oracle_text') or '').split('\n')
            portugues = (face.get('printed_text') or '').split('\n')
            if not face.get('printed_text') or len(ingles) != len(portugues):
                continue
            for en, pt in zip(ingles, portugues):
                memoria.aprender_linha(trocar_nome(en, face['name']), trocar_nome(pt, face.get('printed_name') or '\0'))

    tradutor, rascunhos = Tradutor(), {}
    for carta in oraculo:
        if carta.get('layout') in LAYOUTS_FORA or 'paper' not in carta.get('games', []) or carta['oracle_id'] in com_edicao:
            continue
        rascunho = []
        for face in faces(carta):
            linhas = []
            for linha in (face.get('oracle_text') or '').split('\n'):
                partes = []
                traduzir_linha(linha, face['name'], memoria, tradutor, partes)
                if partes:
                    linhas.append(partes)
            tipo = tipos.traduzir(face.get('type_line') or '')
            if tipo is None and face.get('type_line'):
                tradutor.pedir(face['type_line'])
            rascunho.append((face['name'], face.get('type_line') or '', tipo, linhas))
        rascunhos[carta['oracle_id']] = rascunho

    print(f'{len(rascunhos)} cartas sem edição em português. {len(tradutor.pendentes)} frases novas para o tradutor.', flush=True)
    tradutor.traduzir_pendentes()

    grupos = collections.defaultdict(dict)
    oficiais = automaticas = 0
    for oracle_id, rascunho in rascunhos.items():
        saida = []
        for nome, tipo_en, tipo_pt, linhas in rascunho:
            texto = []
            for partes in linhas:
                pedacos = []
                for origem, conteudo in partes:
                    if origem == 'ok':
                        oficiais += 1
                        pedacos.append(conteudo)
                    else:
                        automaticas += 1
                        pedacos.append(tradutor.resultado(conteudo))
                texto.append(' '.join(pedacos).replace('~', nome))
            saida.append({'t': tipo_pt or tradutor.resultado(tipo_en) if tipo_en else '', 'x': '\n'.join(texto)})
        grupos[oracle_id[:2]][oracle_id] = saida

    DESTINO.mkdir(parents=True, exist_ok=True)
    for antigo in DESTINO.glob('*.json'):
        antigo.unlink()
    for prefixo, cartas in grupos.items():
        (DESTINO / f'{prefixo}.json').write_text(json.dumps(dict(sorted(cartas.items())), ensure_ascii=False, separators=(',', ':')), 'utf-8')
    total = oficiais + automaticas
    print(f'Pronto. {oficiais} frases com termos oficiais e {automaticas} pelo tradutor ({round(oficiais / max(total, 1) * 100)}% oficiais).')


if __name__ == '__main__':
    main()
