# Métrica

App de peças técnicas de georreferenciamento (cópia das funções principais do Métrica Topo),
para o fluxo do escritório Souza Agrimensura.

A partir de um arquivo TXT de coordenadas (GNSS, UTM), o app:

- importa os pontos, separa base/apoio do perímetro e traça a poligonal;
- calcula a **área SGL** (Sistema Geodésico Local, padrão INCRA/SIGEF), perímetro e azimutes;
- gera o **memorial descritivo** (.docx) no modelo do escritório;
- gera a **planilha do SIGEF** (.ods) preenchendo o template oficial;
- gera a **planta** técnica (grade, norte, quadro de dados) para impressão/PDF;
- mostra o terreno em **satélite** e permite **editar** vértices (mover, inserir, apagar,
  inverter sentido, definir início, renumerar).

Os projetos são salvos **no navegador** (IndexedDB). Os dados do responsável técnico ficam
em Configurações (localStorage).

## Rodar

```
npm install
npm run dev
```

Abre em http://localhost:7010

```
npm test        # testes do núcleo de cálculo e dos geradores
npm run build   # build de produção
```

## Como funciona o cálculo (resumo)

As coordenadas do TXT vêm em **UTM SIRGAS2000**. Para a área e o memorial elas são
convertidas para **geográficas** (lat/lon) com `proj4` (elipsoide GRS80). A área é calculada
num **plano topocêntrico local** (geográfica → geocêntrico → ENU → fórmula de Gauss), que é
como o SIGEF certifica a "Área SGL" — não é a área do UTM, que distorce.

Validado com a Fazenda Ventania: **3,6444 ha** e **809,85 m** (modelo: 3,6443 ha / 809,84 m).

A zona UTM **não** é recuperável só do par Leste/Norte (a mesma coordenada é válida em várias
zonas). Por isso há uma zona-base configurável (padrão **23 Sul**, região de Espera Feliz-MG),
ajustável por projeto.

## Estrutura

- `src/lib/topo/` — núcleo de cálculo (sem React): parse do TXT, conversão de coordenadas,
  área SGL, geometria, códigos de vértice, confrontantes. Tem testes.
- `src/lib/export/` — geradores: `memorial.ts` (.docx), `sigefOds.ts` (.ods), e a planta é
  um SVG (`src/components/Planta.tsx`).
- `src/lib/store/` — configurações (localStorage) e projetos (IndexedDB).
- `src/app/` — editor (`page.tsx`) e configurações.
- `public/templates/sigef.ods` — template oficial do SIGEF, preenchido na exportação.

## Próximos passos possíveis
- Salvar projetos na nuvem (Firebase), como nos outros apps do escritório.
- Exportar a planta direto em PDF (hoje via impressão do navegador).
- Importar outros formatos de coordenada além do TXT.
