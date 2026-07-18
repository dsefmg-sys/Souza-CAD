import asyncio
import os
import edge_tts

# Vozes neurais brasileiras disponíveis:
# pt-BR-FranciscaNeural (Feminina, clara, fluida, natural)
# pt-BR-AntonioNeural (Masculino, sóbrio, limpo)
VOICE = 'pt-BR-FranciscaNeural'

PUBLIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'public'))
AUDIO_TUTORIAL_DIR = os.path.join(PUBLIC_DIR, 'audio', 'tutorial')

os.makedirs(AUDIO_TUTORIAL_DIR, exist_ok=True)

# TAREFA 1: PASSOS BÁSICOS
PASSOS_BASE = [
    (
        "passo-base-0.mp3",
        "No SOUZA CAD você escolhe o tamanho da tela. Na barra flutuante embaixo tem uma chave: Fácil ou Completo. No Fácil aparece só o essencial — importar pontos, vizinhos, confrontantes e gerar as peças. No Completo entram desenho, cotas, hachuras e o resto das ferramentas. Pode trocar a qualquer hora: nada do projeto se perde. Na mesma região da barra lateral esquerda, em Visualização e Navegação, fica o botão Folha Travada. Com a folha travada, o carimbo e o layout ficam protegidos. Quer mover título, rosa dos ventos ou escala? Destrave, ajuste, e trave de novo. Assim você não arrasta nada sem querer."
    ),
    (
        "passo-base-1.mp3",
        "O SOUZA CAD foi pensado pra tela larga: dados, mapa e formulários lado a lado, sem ficar rolando pra cima e pra baixo o tempo todo. A barra de controle embaixo você pode arrastar pra onde quiser — é só clicar e puxar — pra ela não cobrir o que você está vendo."
    ),
    (
        "passo-base-2.mp3",
        "Comece pelos pontos. Clique em Pontos e importe o arquivo TXT ou CSV que saiu do seu GPS. Se as colunas vierem em outra ordem, configure o mapeador uma vez e o SOUZA CAD lembra. Ele monta a poligonal e escolhe o fuso UTM com base na sua região."
    ),
    (
        "passo-base-3.mp3",
        "Pra não levar rejeição no INCRA, use o botão SIGEF. O SOUZA CAD busca os imóveis certificados ao redor e desenha os limites no mapa. Dá pra clicar no vértice do vizinho e adotar o código oficial dele na sua divisa — assim os números batem e a divisa fica limpa."
    ),
    (
        "passo-base-4.mp3",
        "No painel de Dados, preencha proprietário, imóvel e cartório. Na hora do Requerimento, escolha o tipo de ato — venda, doação, usucapião, desmembramento ou unificação. O SOUZA CAD monta o texto jurídico e as cláusulas certas pra aquele ato."
    ),
    (
        "passo-base-5.mp3",
        "Com as ferramentas Confro e Divisas, você pinta o perímetro: quem confronta de cada lado e se a divisa é cerca, muro, vala e por aí vai. O SOUZA CAD colore o mapa e monta a legenda sozinho, na planta e no memorial."
    ),
    (
        "passo-base-6.mp3",
        "Quando estiver pronto, exporte tudo: memorial em Word, planilha do SIGEF, requerimento e planta em PDF. As cartas de anuência já saem com a lista de vértices em tabela limpa, sem campo de endereço a mais — menos burocracia na assinatura."
    ),
    (
        "passo-base-7.mp3",
        "O SOUZA CAD vai salvando sozinho, no computador e na nuvem quando você está logado. Os códigos de vértice entram no seu banco de pontos: o mesmo número não se repete em outro projeto da empresa. Seu acervo fica organizado sem esforço."
    ),
]

# TAREFA 2: PASSOS AVANÇADOS
PASSOS_AVANCADOS = [
    (
        "passo-avancado-0.mp3",
        "Dois códigos diferentes no mesmo canto físico é o erro que mais rejeita no SIGEF. No modo Completo, a ferramenta Casar acha pontos que coincidem com o vizinho certificado e unifica os nomes. Também dá pra importar o arquivo de outro agrimensor no painel de Vizinhos e alinhar a divisa comum."
    ),
    (
        "passo-avancado-1.mp3",
        "No SOUZA CAD você enriquece a planta com linhas, cotas, textos livres e símbolos — poste, marco, árvore. Dá pra hachurar áreas de preservação ou servidão, em linhas a quarenta e cinco graus ou em grade, e organizar tudo por camadas, com cor e espessura do seu jeito. Na mesma região da barra lateral esquerda, em Visualização e Navegação, fica o botão Folha Travada. Pra reposicionar a rosa dos ventos, a escala, o título ou qualquer pedaço do carimbo, a folha precisa estar destravada. Destrave, ajuste o layout, e trave de novo. Travada, nada se move sem querer — o ideal pro dia a dia."
    ),
    (
        "passo-avancado-2.mp3",
        "Tem canto que não dá pra ocupar no campo — meio de rio, dentro de uma construção. Aí entra o vértice virtual: o SOUZA CAD calcula a posição por distância e direção, ou pelo cruzamento de dois alinhamentos. O ímã gruda o cursor no canto certo. Paralela, Dividir e Prolongar fecham o acabamento do desenho."
    ),
    (
        "passo-avancado-3.mp3",
        "Matrícula antiga com vários erros? No painel de Errata você junta correções de tipos diferentes — área, confrontação, nome — e o SOUZA CAD organiza isso numa narrativa só, pronta pro cartório."
    ),
    (
        "passo-avancado-4.mp3",
        "O INCRA não aceita a área “plana” do UTM. O SOUZA CAD calcula área e perímetro no Sistema Geodésico Local, o mesmo critério do SIGEF. Assim o número da sua planta bate com o que o sistema federal confere."
    ),
    (
        "passo-avancado-5.mp3",
        "Seu equipamento manda vírgula, ponto e vírgula ou tabulação? Colunas em outra ordem? O mapeador de colunas do SOUZA CAD associa os campos em segundos e guarda a configuração pras próximas importações."
    ),
    (
        "passo-avancado-6.mp3",
        "Sem sair do projeto: registre valor, despesas e parcelas. O SOUZA CAD gera contrato de prestação de serviço e recibo com valor por extenso, prontos pra imprimir ou assinar."
    ),
]

# TAREFA 3: TEMAS DE AJUDA
TEMAS_AJUDA = [
    ("tema-modos-iniciante.mp3", "No SOUZA CAD tem duas coisas diferentes. A chave Fácil e Completo, na barra de baixo, decide quantas ferramentas aparecem. No Fácil fica o caminho essencial: pontos, vizinhos, confrontantes e peças. No Completo entram desenho, cotas, hachuras, errata e CAR. A tela é larga de propósito: colunas lado a lado, menos rolagem. O nível da ajuda, iniciante ou experiente, só muda o tamanho destas explicações — não muda as ferramentas."),
    ("tema-modos-experiente.mp3", "No SOUZA CAD, a chave faz uma coisa só: o Fácil esconde desenho avançado, errata, CAR e banco de pontos; o Completo mostra tudo. O layout é horizontal de propósito, pra aproveitar a largura da tela. Lembre que o nível da ajuda é separado do modo — só muda o quanto eu explico, nunca as ferramentas."),
    ("tema-desenho-achuras-iniciante.mp3", "No Completo, o SOUZA CAD deixa você enfeitar o mapa e a planta: linhas, polilinhas, cotas e textos. Polígono fechado pode ganhar cor e hachura — linhas a quarenta e cinco graus, grade ou pontos. Símbolos como árvore, poste ou casa entram pelos botões, e você ajusta o tamanho no painel do objeto."),
    ("tema-desenho-achuras-experiente.mp3", "No SOUZA CAD, no modo Completo, você tem objetos livres pra enriquecer a planta: polilinha com cor e espessura, polígono com preenchimento e hachura, símbolos de dez a cento e cento e cinquenta pixels. Tudo organizado por camada, do seu jeito. É assim que a planta sai com cara de trabalho profissional."),
    ("tema-georreferenciamento-iniciante.mp3", "Georreferenciar é medir o imóvel rural com coordenadas oficiais do Brasil e registrar no SIGEF, o sistema do INCRA. Depois de certificado, os limites valem em todo o país. Sem isso, o cartório trava venda e divisão de muitos imóveis rurais. O SOUZA CAD cuida da parte técnica: área no critério certo, planilha no formato do SIGEF e documentos pro cartório."),
    ("tema-georreferenciamento-experiente.mp3", "O fluxo no SOUZA CAD é direto: importar pontos, código por credenciado com banco único, ODS no modelo oficial e área no SGL. A conferência já barra tudo que o SIGEF rejeita. E vértice compartilhado com o vizinho mantém sempre o mesmo código — isso é o jeito certo de fazer."),
    ("tema-campo-desenho-iniciante.mp3", "O GPS entrega um arquivo de texto com leste e norte de cada ponto. O mesmo par de números existe em vários fusos do planeta. O SOUZA CAD sugere o fuso comparando com cidades da sua região — você confirma na prévia. Se o desenho cair longe no mapa, o fuso está errado: troque antes de importar."),
    ("tema-campo-desenho-experiente.mp3", "No SOUZA CAD, o mapeamento de colunas fica nas Configurações. A detecção de fuso usa âncoras regionais. Vale restringir os fusos à sua área de atuação. Se nenhuma âncora resolver, é só confirmar o fuso na mão, na prévia, antes de importar."),
    ("tema-vizinhos-iniciante.mp3", "Se o vizinho já certificou, a divisa comum já tem código oficial. A regra é reaproveitar esse código, nunca inventar outro pro mesmo canto. No SOUZA CAD, o botão SIGEF busca os imóveis certificados ao redor e desenha o contorno. Clique no vértice do vizinho pra adotar o código dele — evita a rejeição mais comum."),
    ("tema-vizinhos-experiente.mp3", "No SOUZA CAD, o botão SIGEF consulta o acervo e salva as parcelas. Depois vira Análise, com checagem de sobreposição. Você adota o vértice pelo clique, ou importa o arquivo do Distribuidor de Coordenadas. Vértice adotado não gasta numeração do seu banco — é economia no dia a dia."),
    ("tema-confrontantes-iniciante.mp3", "Confrontante é quem faz divisa com o imóvel. Cada trecho precisa de um nome. No SOUZA CAD, use o pincel: escolha o confrontante e clique nos vértices do trecho. Cada um ganha cor e entra na legenda. Tipo de divisa — cerca, estrada, córrego — também se pinta. Atalho: duplo clique no vértice ou no trecho pra ajustar na hora, no mapa ou na planta."),
    ("tema-confrontantes-experiente.mp3", "No SOUZA CAD, o pincel é de dois cliques: do início ao fim do trecho. Posseiro sai sem matrícula; espólio precisa de inventariante. O cônjuge do confrontante já ganha espaço de assinatura. Os tipos de divisa alimentam o memorial e a planilha. E o duplo clique abre o ajuste rápido, na hora."),
    ("tema-area-sgl-iniciante.mp3", "A área que o SIGEF certifica não é a área “no papel plano”. Ela considera a curvatura da Terra e a altitude. Por isso quase sempre difere um pouco da área UTM de outros programas. Não é erro. O SOUZA CAD já calcula no sistema que o INCRA confere."),
    ("tema-area-sgl-experiente.mp3", "No SOUZA CAD, o SGL usa origem no primeiro vértice e elevação média. A conferência reconcilia com o retorno do SIGEF quando você cola o valor. O fator K e a convergência saem na caixa de coordenadas da planta — tudo no critério que o INCRA confere."),
    ("tema-memorial-iniciante.mp3", "O memorial conta o perímetro lado a lado: azimute, distância, tipo de divisa e confrontante, até fechar no ponto inicial. O SOUZA CAD gera o Word pronto — identificação no topo, narrativa limpa e blocos de assinatura que não quebram no meio da página. Confira os dados do imóvel antes de gerar."),
    ("tema-memorial-experiente.mp3", "No SOUZA CAD, o memorial sai em Word com Arial, e as assinaturas não quebram de página. O TRT vem do projeto. A narrativa usa os valores da conferência. E os campos colados passam por uma limpeza de caracteres invisíveis — nada de sujeira no documento."),
    ("tema-planta-iniciante.mp3", "A planta do SOUZA CAD sai em A3 deitada: desenho à esquerda, carimbo à direita com dados, declarações e laudo. Embaixo, satélite, convenções e coordenadas. Quase tudo se arrasta — textos, rótulos, blocos — e a posição fica salva no projeto. As marcas no topo são guias de dobra pra caber em pasta A4. Lembre: pra mexer no layout, destrave a folha na barra lateral."),
    ("tema-planta-experiente.mp3", "No SOUZA CAD, a planta vem com margens ABNT, escala automática ou manual e grade sem vazamento. O estilo de vértice pode ser SIGEF ou P1, P2. A posição, a escala e o negrito são por elemento, e ficam salvos no projeto. O PDF sai pela impressão do navegador — vale conferir a escala gráfica."),
    ("tema-requerimento-iniciante.mp3", "O Requerimento é o pedido formal pro cartório de imóveis. No SOUZA CAD você escolhe o tipo de ato — venda, doação, usucapião, desmembramento ou unificação. Ele já vem preenchido com proprietário, comprador e imóvel, com os artigos de lei certos."),
    ("tema-requerimento-experiente.mp3", "No SOUZA CAD, o Requerimento adapta as cláusulas pelo tipo de ato. Venda com reserva de usufruto traz as obrigações do usufrutuário. Retificação cita a Lei 6.015. E os transmitentes entram com qualificação completa pro registro."),
    ("tema-dxf-editor-iniciante.mp3", "O editor DXF abre desenhos do AutoCAD direto no navegador. Você pode selecionar elementos, trocar cores, ocultar camadas e exportar pro mapa do SOUZA CAD. É útil pra trazer levantamentos antigos sem precisar instalar programas pesados."),
    ("tema-dxf-editor-experiente.mp3", "No editor DXF do SOUZA CAD, os polígonos são convertidos em anéis com cálculo de centroide. Você pode filtrar por camada, juntar entidades desconectadas e transformar polilinhas DXF em glebas prontas pro SIGEF."),
    ("tema-car-iniciante.mp3", "O Cadastro Ambiental Rural, ou CAR, registra a reserva legal, a área de preservação permanente e o uso do solo do imóvel. No SOUZA CAD você desenha ou importa esses limites e confere as porcentagens com o código florestal."),
    ("tema-car-experiente.mp3", "No SOUZA CAD, as áreas ambientais geram o quadro comparativo automático. A Reserva Legal é conferida contra os vinte por cento mínimos da região sudeste e demais biomas. E a exportação shapefile sai com os atributos exigidos pelos sistemas estaduais."),
    ("tema-trt-iniciante.mp3", "O TRT ou ART é a responsabilidade técnica do seu conselho, como CRT ou CREA. No SOUZA CAD você digita o número uma vez nas configurações e ele entra automaticamente em todos os memoriais, plantas e requerimentos."),
    ("tema-trt-experiente.mp3", "No SOUZA CAD, o número do TRT/ART valida a assinatura digital e o código do credenciado. Se mudar o conselho ou a atribuição profissional, os modelos se adaptam na hora sem precisar reescrever."),
    ("tema-financeiro-iniciante.mp3", "No painel de Finanças do SOUZA CAD você anota quanto cobrou no serviço, os custos de combustível e taxas de cartório, e os pagamentos recebidos. O sistema calcula seu lucro real e emite o recibo pro cliente."),
    ("tema-financeiro-experiente.mp3", "A gestão financeira do SOUZA CAD traz demonstrativo de fluxo de caixa do projeto e indicador de margem líquida. O contrato de prestação de serviço já sai com cronograma financeiro e multas de atraso configuradas.")
]

# TAREFA 4: INTRODUÇÃO GERAL (/public/introducao.mp3)
TEXTO_INTRODUCAO = (
    "Seja bem-vindo ao SOUZA CAD, seu sistema profissional de engenharia agrimensura e georreferenciamento. "
    "Aqui você gerencia projetos, importa coordenadas de GPS e SIGEF, gera memoriais descritivos, plantas A3 com carimbo inteligente e todos os documentos exigidos pelos cartórios de imóveis e pelo INCRA. "
    "Alterne entre o modo Fácil para o dia a dia e o modo Completo para ferramentas avançadas de CAD e desenho. "
    "Bons trabalhos!"
)

async def gerar_audio(filename, texto, dest_dir=AUDIO_TUTORIAL_DIR):
    filepath = os.path.join(dest_dir, filename)
    print(f"Gerando: {filename}...")
    communicate = edge_tts.Communicate(texto, VOICE)
    await communicate.save(filepath)

async def main():
    print("Iniciando geração de áudios em MP3 com voz neural profissional (pt-BR-FranciscaNeural)...")
    
    # 1. Gerar Passos Básicos
    for filename, texto in PASSOS_BASE:
        await gerar_audio(filename, texto)
        
    # 2. Gerar Passos Avançados
    for filename, texto in PASSOS_AVANCADOS:
        await gerar_audio(filename, texto)
        
    # 3. Gerar Temas de Ajuda
    for filename, texto in TEMAS_AJUDA:
        await gerar_audio(filename, texto)

    # 4. Gerar introducao.mp3 na raiz do /public
    await gerar_audio("introducao.mp3", TEXTO_INTRODUCAO, dest_dir=PUBLIC_DIR)
    
    # 5. Gerar tutorial.mp3 (concatenando resumo) na raiz do /public
    texto_tutorial_geral = TEXTO_INTRODUCAO + " " + " ".join([t[1] for t in PASSOS_BASE])
    await gerar_audio("tutorial.mp3", texto_tutorial_geral, dest_dir=PUBLIC_DIR)

    print("✅ Todos os áudios foram gerados com sucesso na pasta public/audio/tutorial/!")

if __name__ == "__main__":
    asyncio.run(main())
