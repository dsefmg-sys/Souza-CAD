# Roteiro de tutorial em áudio — Souza CAD (Métrica)

Este é o texto para narração. Cada bloco numerado é um trecho independente, pensado para virar um
áudio curto que pode ser colocado na parte correspondente do app. A linguagem é de conversa, para
soar natural quando lida por uma voz. Sem siglas soltas sem explicação, sem emojis.

---

## 1. Boas-vindas

Olá, e bem-vindo ao seu sistema de agrimensura. Aqui você faz o caminho completo de um
georreferenciamento: parte das coordenadas que veio do campo, calcula a área do jeito que o INCRA
aceita, e gera o memorial, a planilha, a planta e os documentos do cartório, tudo no mesmo lugar.
Vou te acompanhar por cada parte. Não precisa decorar nada, é só ir seguindo o fluxo que o app mostra
na tela, da esquerda para a direita.

## 2. Entrar na sua conta

A primeira coisa é entrar na sua conta. Você pode entrar com o Google ou com e-mail e senha. Quando
você está logado, seus projetos e seus cadastros ficam guardados na nuvem, então você abre no
computador do escritório e continua no notebook de casa, sem perder nada. Se preferir trabalhar sem
entrar, o app também funciona, mas aí os projetos ficam salvos só naquele navegador. A recomendação é
entrar, para ter o backup na nuvem.

## 3. Configurar o técnico e o escritório

Antes de começar, vale preencher uma vez os seus dados. Tem duas partes. A do responsável técnico é o
seu nome, sua formação, o número do seu registro no conselho, e o seu código de credenciamento no
INCRA, que é aquele prefixo que aparece na frente de cada vértice. A do escritório é o nome da
empresa, o endereço, o telefone e o logotipo, que é o que sai no carimbo da planta. Você preenche
isso uma vez e o sistema usa em todas as peças, sempre. Se algum dia mudar, é só editar ali.

## 4. Modo Simples e modo Completo

Lá no topo tem uma chave que troca entre modo Simples e modo Completo. No Simples, o app esconde as
ferramentas avançadas e deixa só o caminho essencial, ideal para quem está começando. No Completo,
aparece tudo: calculadora, editor de desenho, e as ferramentas extras. Comece no Simples, e quando se
sentir à vontade, ligue o Completo para ter o resto na mão.

## 5. Os dados do imóvel

O primeiro painel é a identificação do imóvel. Aqui você diz se é rural ou urbano, coloca a
denominação, a matrícula, o cartório, o município, e o proprietário. Conforme você digita o nome do
proprietário ou do cartório, o app sugere os que você já cadastrou antes, para não redigitar. Esses
dados alimentam o memorial, a planta e os documentos, então quanto mais completo aqui, menos trabalho
depois.

## 6. Leitura automática com inteligência artificial

Se você tem o PDF da matrícula, da escritura, ou até uma foto do documento, tem um botão de leitura
automática. Você envia o arquivo, e a inteligência artificial lê e sugere o preenchimento do cadastro:
proprietário, CPF, matrícula, confrontantes. Ela mostra o que encontrou para você conferir e decidir o
que entra no projeto. É um atalho para não digitar tudo à mão, mas sempre revise antes de aceitar.

## 7. Importar o arquivo de coordenadas

Agora o coração do trabalho: trazer os pontos do campo. Você importa o arquivo de texto que saiu do
seu GNSS, aquele com as coordenadas já corrigidas. Uma observação importante: o app parte de pontos já
processados. Ele não faz o pós-processamento do sinal bruto do satélite; isso você faz no programa do
seu equipamento e traz o resultado para cá.

Ao importar, abre uma prévia. Do lado esquerdo aparece a lista de todos os pontos, com uma marca para
dizer quais entram e quais são só referência. Você pode reordenar arrastando, e clicar num ponto para
ver ele destacado no satélite. Isso evita erro antes de fechar a poligonal.

## 8. Fuso, zona e a área do jeito certo

Quando os pontos entram, o app traça a poligonal e calcula a área. E aqui tem um detalhe que faz toda a
diferença. A área não é calculada no plano do UTM, porque o UTM distorce um pouco. Ela é calculada no
Sistema Geodésico Local, que é o cálculo que o INCRA usa e aceita. Por isso a sua área bate com a do
SIGEF. O app também cuida do fuso. Em regiões que ficam na divisa de dois fusos, ele usa o município
como âncora para escolher o fuso certo, então você não precisa adivinhar.

## 9. Trabalhando no mapa

Com a poligonal na tela, você tem um editor sobre o satélite. Dá para navegar, dar zoom com a rolagem
do mouse, e ligar o modo de mover para arrastar qualquer ponto. Clicando com o botão direito em
qualquer lugar do mapa, aparece um menu para inserir um vértice ali, criar um vértice virtual, ou
escrever um texto. Tem também o ímã, que gruda o ponto novo num vértice próximo quando você quer casar
exatamente uma divisa.

## 10. Criar um vértice virtual

Às vezes tem um canto que você não consegue ocupar de verdade: o meio de um rio, um ponto dentro de uma
benfeitoria. Para isso existe o vértice virtual, o tipo V. Você abre a ferramenta e escolhe uma de duas
formas. A primeira é por afastamento: você parte de um ponto que ocupou, informa o azimute e a
distância que mediu até o canto, e o app calcula a coordenada. A segunda é por interseção de
alinhamentos: o vértice nasce no cruzamento de duas retas, cada uma definida por dois pontos que você já
tem. O app mostra a coordenada calculada na hora, e ao confirmar, o vértice entra na poligonal e recebe
um código automaticamente.

## 11. O banco de pontos

Cada vértice recebe um código do seu credenciamento, e o sistema guarda isso num banco de pontos. A
regra de ouro é: um número, uma vez usado, nunca se repete. Isso garante que você não vai batizar dois
cantos diferentes com o mesmo código ao longo dos seus projetos. Você pode consultar tudo que já
registrou, buscar, e gerenciar esse banco quando precisar.

## 12. Confrontantes e divisas

Cada lado da sua poligonal encosta num vizinho. Você marca isso indicando o confrontante de cada trecho
e o tipo de divisa: cerca, córrego, estrada, muro, linha ideal. Isso pinta a divisa com a cor certa e,
mais importante, escreve o memorial contando a história do perímetro corretamente, vizinho por vizinho.
O confrontante pode ser proprietário com matrícula, possuidor sem matrícula, ou espólio, e o app trata
a assinatura de cada caso, inclusive do cônjuge quando você preenche.

## 13. Parcelas certificadas do vizinho

O app conversa com a base do INCRA. Você consegue trazer as parcelas dos imóveis vizinhos que já foram
certificados, para enxergar exatamente onde encostam na sua. Clicando numa parcela, ela acende e mostra
os dados dela. E quando um vértice seu está bem em cima de um vértice certificado do vizinho, o app casa
a sua coordenada com a coordenada oficial, que é o que a norma exige na divisa comum. Se você tem o
arquivo de coordenadas do vizinho, também dá para importar e reaproveitar os pontos que encostam.

## 14. Análise de sobreposição

Antes de fechar, vale rodar a análise de sobreposição. Ela compara o seu perímetro com o que já está
cadastrado e avisa se você está invadindo a área de alguém. É uma checagem de segurança que evita
retrabalho lá na frente, quando o processo já está no órgão.

## 15. Responsabilidade técnica

Todo trabalho precisa do seu termo de responsabilidade, o TRT ou a ART, dependendo do seu conselho.
Tem um lugar para você colocar o número desse termo no projeto. Quando ele está preenchido, a etapa
fica marcada como pronta, e o número entra automaticamente nas peças.

## 16. A conferência antes de exportar

O app tem uma conferência que roda antes de gerar qualquer documento. Ela separa dois tipos de
problema. Os graves, como poligonal com menos de três vértices, vértice sem código, ou código
repetido, travam a exportação de verdade, porque sairiam peças inválidas. Os leves, como um campo em
branco ou um CPF com cara de errado, só avisam e deixam você seguir se quiser. É uma rede de proteção
para você não mandar um documento com furo para o cartório.

## 17. O memorial descritivo

Com tudo certo, você gera o memorial descritivo, já em formato de documento do Word. Ele traz o
cabeçalho do imóvel, a descrição do perímetro contada em texto, a tabela de roteiro, e os campos de
assinatura do técnico, dos proprietários e dos confrontantes. Se o imóvel é de Mato Grosso, aparece a
opção de usar o padrão do INTERMAT, o instituto de terras do estado. Nesse padrão, o memorial ganha a
referência ao órgão e o parágrafo de finalidade da regularização estadual, mantendo todo o resto igual
ao padrão do INCRA. Essa opção só aparece quando o município é de lá, para não confundir quem trabalha
em outros estados.

## 18. A planilha do SIGEF

Junto do memorial, o app gera a planilha no formato que o SIGEF pede, aquele arquivo ODS. Ela é
preenchida automaticamente com os vértices, os códigos, os métodos e as precisões. Tem também uma tela
de conferência da planilha, onde você revê linha por linha antes de subir no sistema do INCRA.

## 19. A planta

A planta sai numa folha A3 profissional, com o carimbo do seu escritório, as convenções, os três
nortes, a rosa dos ventos, a barra de escala e o quadro de coordenadas. Você pode baixar direto em PDF.
E ela é editável: dá para mover e ajustar os textos, mudar a escala, ligar e desligar blocos, editar os
rótulos dos vértices e dos confrontantes com duplo clique, e até gerar a planta de situação
automaticamente. Tudo o que você ajusta fica salvo junto do projeto.

## 20. Requerimento, errata e carta de anuência

Além do memorial e da planta, o app monta os documentos do cartório. Tem o requerimento de averbação,
que já vem com os campos preenchidos pelos dados do projeto. Tem a errata, para corrigir um erro
material sem refazer tudo. E tem a carta de anuência dos confrontantes. Todos saem prontos para
imprimir e assinar.

## 21. As ferramentas extras

No modo Completo você tem uma caixa de ferramentas. A calculadora converte coordenada, calcula
distância e azimute, e faz conversão em lote de várias coordenadas de uma vez. Tem a divisão de gleba
por área alvo, para partir um imóvel numa área exata, por exemplo tirar seis hectares de dez. Tem a
porcentagem entre dois polígonos. Tem o editor de DXF, para abrir e mexer num desenho qualquer,
separado do seu projeto de agrimensura. E tem o estúdio, que é um mini editor de imagem para tratar
fotos e figuras. O app também exporta para outros formatos de campo, como o arquivo do GPS, e formatos
de mapa como shapefile.

## 22. Cadastro ambiental e outros processos

O app também ajuda no desenho das geometrias do cadastro ambiental rural, aquelas camadas de área de
preservação, reserva legal e uso consolidado, para você preparar o que vai para o sistema ambiental.

## 23. Gestão do projeto

Cada projeto tem uma tela administrativa. Ali você controla a parte financeira: quanto cobrou, os
gastos, os recebimentos e o saldo. E dá para emitir o recibo e o contrato para o cliente, já em PDF.
É o controle do serviço inteiro, junto com o trabalho técnico.

## 24. Salvar, certificar e seus projetos

Ao longo do caminho, o app salva sozinho para você não perder trabalho, mas você também salva quando
quiser. Todos os seus projetos ficam numa lista para reabrir a qualquer momento. E quando o trabalho
está fechado e conferido, você segue para a certificação com a tranquilidade de que os números foram
travados por testes internos e batem com o que o INCRA calcula.

## 25. Fecho

E é isso. O segredo é seguir o fluxo na ordem que a tela mostra: dados do imóvel, importar as
coordenadas, ajustar no mapa, marcar confrontantes e divisas, conferir, e gerar as peças. Com um pouco
de prática, um georreferenciamento inteiro sai em minutos. Bom trabalho.
