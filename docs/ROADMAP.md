# Roadmap — Métrica (peças técnicas SIGEF)

Construção em **etapas**. Cada etapa termina com **verificação automática** (testes + conferência
contra os modelos reais). Precisão total é requisito: são documentos que não podem ter erro.

Pilar fixo: **SIRGAS2000** (datum atual; centralizado num único ponto do código para troca futura).

## Já pronto (Etapa 0 — base)
Importar TXT, área SGL validada (3,6443 ha), memorial .docx, ODS SIGEF (1 gleba), planta básica,
mapa satélite, edição de vértices, configurações, projetos no navegador (IndexedDB).

## Concluído (Etapa 1 — precisão e cadastros) + revisão adversarial
Banco de pontos por credenciado (nunca repete), cadastros (proprietário/confrontante/imóvel/
cartório), detecção de fuso pela âncora do município (resolve 23/24), conferência + reconciliação
da área SGL do SIGEF, guardas que impedem peça sem código. Revisão adversarial multiagente
corrigiu 6 bugs reais (renumeração preservando registro, fonte SIGEF/misto, validação de código
nas exportações, etc.), travados por testes (30 passando).

### Melhorias rápidas já feitas (pedidos do dono)
Tema escuro; escala da planta em múltiplos de 250 (1:3000, 1:3250…); renomear projetos; zoom do
mapa liberado + camada híbrida (Google); esconder nomes dos pontos; guardas contra "map data not
yet available"; excluir pontos (modo apagar). 

### Novos pedidos a distribuir nas etapas
- Etapa 3 (planta): linhas de troca de confrontante saindo dos vértices; representação por tipo.
- Etapa 4 (CAD leve): selecionar vários objetos; snap; editar na visão de mapa E de planta.
- Cartório: reutilização de CNS já entregue (cadastro + sugestão nos campos).

## Concluído (DXF georreferenciado) + comparação com QCAD/SolarCAD
Importar e exportar **DXF em UTM (metros)**, com a poligonal, pontos e rótulos, e o **SRC
anotado** (SIRGAS2000 / UTM fuso N) no desenho. Round-trip testado.

Os pontos fracos que o dono levantou sobre QCAD/SolarCAD estão **resolvidos por desenho** aqui,
porque o Métrica é georreferência-nativo (não um CAD genérico):
- **Conhece o SRC/datum** (SIRGAS2000 + fuso por projeto) — o QCAD trata como plano genérico.
- **Reprojeta UTM↔lat/long** nativamente (proj4) — o QCAD não reprojeta.
- **Mapa de fundo georreferenciado** (satélite Leaflet alinhado por coordenada) — o QCAD não tem.
- **Não perde a etiqueta de SRC ao salvar**: o DXF exportado leva o SRC anotado (layer + TEXT);
  e o app guarda fuso/datum no projeto, então a georreferência nunca depende só do arquivo.
Falta (futuro, se necessário): escrever o objeto `GEODATA` formal do DXF e reprojeção entre
fusos na importação (hoje assume o fuso do projeto, que é o caso real do dono).

## Concluído (Documentos cartoriais)
- **Requerimento de averbação com retificação de área** (.docx) gerado automaticamente,
  reaproveitando imóvel/proprietário/área/técnico; campos novos de qualificação (requerente e
  transmitente), área anterior da matrícula, valor + valor por extenso. Modal próprio com
  autocompletar dos cadastros. Espec em `docs/ESPEC-REQUERIMENTO.md`.
- Próximas variações de requerimento (sem transmissão, etc.) ficam para depois.

## Resumo do estado (após esta rodada)
Concluído: Etapa 0, Etapa 1 (+ revisão adversarial, 6 bugs), Etapa 2 (tipo de limite/método +
multi-gleba, + revisão de corrida), requerimento cartorial, e os ajustes rápidos. 39 testes
passando, build limpo. **Próximo grande bloco: Etapa 3 — motor de planta A3 profissional**
(carimbo, convenções com representação por tipo de divisa, 3 nortes, situação, PDF A3).

---

## Etapa 1 — Precisão, banco de pontos e conferência
Objetivo: tornar o núcleo à prova de erro e reutilizável.
- **Auto-detecção de zona UTM** (23/24 e demais), com fusos permitidos configuráveis em Ajustes.
  Espera Feliz fica sobre a divisa 23/24 — detecta pela consistência da longitude.
- **Banco de pontos por credenciado (COIN)**: numeração sequencial global que **nunca repete**
  um ponto já usado; guarda quais pontos cada imóvel usou. Tipos M, P, V e métodos PA1/PA2/PT8.
- **Renomear/numerar pontos pela lógica do SIGEF** (M = canto de divisa, P = intermediário,
  V = virtual; métodos SIGEF).
- **Cadastros reutilizáveis**: Proprietários, Confrontantes, Imóveis (CRUD), usados nas peças
  com poucos cliques.
- **Etapa de conferência**: validações (poligonal fechada, sem auto-interseção, vértices
  duplicados, precisão/sigma do GNSS) + **reconciliação com o rascunho do SIGEF**: campo para
  inserir a área e o perímetro SGL oficiais do SIGEF; o sistema mostra a diferença e passa a
  usar os valores oficiais nas peças finais (memorial, planta, planilha).

## Etapa 2 — Múltiplas glebas + ODS oficial completo
- [FEITO] **Tipo de limite por divisa** (LA1-LA7/LN1-LN6) e **método por vértice**
  (PG/PA/PT, inclui PT8 virtual), com as listas oficiais do template; ligados na planilha.
- [FEITO] Modelo de dados **multi-gleba** (várias parcelas num imóvel) + UI de glebas (trocar/
  criar/renomear/remover) + migração de projetos antigos + geração por gleba ativa.
- [PENDENTE] **ODS num único arquivo com várias abas `perimetro_N`** (uma por gleba). Hoje
  geramos uma planilha por gleba (arquivos separados), que é o fluxo já validado do dono. O
  multi-aba precisa de um template oficial multi-parcela para conferir a validade no SIGEF.

## Etapa 3 — Motor de planta A3 profissional  [GRANDE PARTE FEITA]
Feito: layout A3 com carimbo do escritório (logo editável), confrontantes com rótulo + linha de
assinatura por divisa, convenções por tipo de divisa, três nortes (NV/NQ/NM com convergência
calculada + declinação informada), bloco de informações de coordenadas, texto central da gleba,
impressão em folha A3. Falta: **planta de situação** (recorte sobre satélite) e **botão de PDF
direto** (hoje via impressão do navegador → salvar como PDF).

### (referência original)
A planta dos modelos, fiel: A3, carimbo do escritório (com logotipo), bloco de título com todos
os campos, blocos de assinatura (proprietário, laudo técnico, declaração dos confrontantes).
- Confrontantes com rótulo + linha de assinatura ao lado de cada divisa.
- Texto central com dados da gleba; bloco lateral de informações.
- Bloco "Informações de Coordenadas" (vértice ref, lat/long, declinação magnética, convergência,
  MC, K, SGR).
- Grade de coordenadas, **três nortes (NQ/NM/NV)**, rosa dos ventos, barra de escala + escala numérica.
- **Legenda de convenções** com **representação gráfica automática por tipo de divisa**
  (cerca, estrada, córrego, açude, linha ideal, marcos M/P/V).
- **Planta de situação** (recorte do polígono sobre satélite).
- **Exportar PDF A3** de verdade.

## Etapa 4 — Editor gráfico da planta (CAD leve)
- Desenhar linhas e polilinhas; mover e redimensionar objetos; textos (tamanho, alinhamento);
  **cotar segmentos**; cor sólida (lago) e hachuras (mata, raro); **pesos de linha por norma**
  (divisa do imóvel mais grossa, auxiliares mais finas).
- **Pontos virtuais PA1/PA2/PT8**; criar/editar vértices com método.
- **Grupos automáticos** (todos os pontos, todos os rótulos, por tipo) com seleção em massa —
  sem camadas manuais.
- Gestão dos dados dos pontos importados (nome, coordenadas).

## Etapa 5 — Memorial multi-modelo + TRT + conferência cruzada
- [FEITO] Tela **"Dados para TRT"**: compila tudo para o registro do TRT, com cópia campo a
  campo e "copiar tudo".
- Memorial cobrindo variações: gleba única, várias glebas, **área a destacar/desmembramento**
  (bate com os modelos A/B/C/AD/ABC).
- **Conferência cruzada final**: memorial × planta × ODS usam os mesmos vértices, área e
  confrontantes; relatório de divergências antes de exportar.

## DXF georreferenciado — FEITO (ver seção acima)
## Planta PDF A3 direto — FEITO (botão "Planta PDF")

## Etapa 6 — Integração SIGEF (confrontantes certificados) [requer pesquisa]
- Importar a geometria de imóveis confrontantes **já certificados no SIGEF** para o nosso
  polígono **encostar perfeitamente** nos pontos do outro agrimensor. Spike de pesquisa sobre a
  fonte oficial (download de parcela por código/SHP/serviço do INCRA).

## Etapa 7 — Futuro (opcional)
- **Topografia convencional** (plano local, sem georreferenciamento) reaproveitando o motor de
  planta/memorial. Recomendação: começar **só SIGEF** e deixar o motor genérico para encaixar
  convencional depois sem retrabalho.
- **Nuvem (Firebase) + multiusuário/multi-fuso/multi-credenciado** (contador de pontos por
  credenciado), para disponibilizar a outras pessoas.

---

## Cross-cutting (em todas as etapas)
- Testes automatizados + etapa de verificação/conferência.
- SIRGAS2000 como pilar, trocável num único ponto do código.
- Fluxo de telas seguindo a ordem real do trabalho do dono (importar → poligonal → imóvel →
  confrontantes → divisas/representação → infos centrais → folha/carimbo → situação → grade →
  nomear pontos → gerar memorial/planta/ODS).
