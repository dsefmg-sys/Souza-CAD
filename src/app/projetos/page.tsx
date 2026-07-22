'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, FolderOpen, Trash2, CheckCircle2, AlertTriangle, DownloadCloud, RotateCcw, XCircle, Download, Pencil, FileSpreadsheet } from 'lucide-react';
import { importarOdsParaProjeto } from '@/lib/io/odsImporter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Projeto } from '@/lib/topo/types';
import { listarProjetos, excluirProjeto, listarLixeira, restaurarProjeto, excluirDefinitivo, purgarLixeiraAntiga, salvarProjeto } from '@/lib/store/projects';
import { migrarProjeto } from '@/lib/topo/glebas';
import { conferirProjetoGlebas } from '@/lib/topo/conferenciaExportacao';
import { carregarTecnico } from '@/lib/store/settings';
import { exportarBackupZip, exportarProjetoZip } from '@/lib/store/backup';
import { confirmar, avisar, perguntar } from '@/lib/ui/dialogos';

type FiltroStatus = 'todos' | 'prontos' | 'incompletos';

const normalizar = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

export default function ProjetosPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [lixeira, setLixeira] = useState<Projeto[]>([]);
  const [verLixeira, setVerLixeira] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroStatus>('todos');
  const [gerandoBackup, setGerandoBackup] = useState(false);
  const [exportandoId, setExportandoId] = useState<string | null>(null);
  const DIAS_LIXEIRA = 90;

  async function handleImportarOds(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const proj = await importarOdsParaProjeto(file);
      await avisar({
        titulo: 'Planilha ODS Importada!',
        mensagem: `O projeto "${proj.nome}" foi criado com sucesso a partir da planilha ODS, contendo ${proj.glebas[0]?.vertices?.length || 0} vértices.`
      });
      carregarTudo();
    } catch (err: any) {
      await avisar({
        titulo: 'Erro ao Importar ODS',
        mensagem: err.message || 'Falha ao processar a planilha ODS.'
      });
    } finally {
      e.target.value = '';
    }
  }

  async function baixarBackup() {
    setGerandoBackup(true);
    try { await exportarBackupZip(); }
    catch (e) { await avisar({ titulo: 'Backup', mensagem: 'Não consegui gerar o backup: ' + ((e as Error).message || 'erro') }); }
    finally { setGerandoBackup(false); }
  }

  async function renomear(p: Projeto) {
    const novo = await perguntar({ titulo: 'Renomear projeto', mensagem: 'Novo nome do projeto:', valorInicial: p.nome });
    if (!novo || novo === p.nome) return;
    await salvarProjeto({ ...p, nome: novo });
    carregarTudo();
  }

  async function exportarProjeto(p: Projeto) {
    setExportandoId(p.id);
    try { await exportarProjetoZip(migrarProjeto(p)); }
    catch (e) { await avisar({ titulo: 'Exportar projeto', mensagem: 'Não consegui exportar este projeto: ' + ((e as Error).message || 'erro') }); }
    finally { setExportandoId(null); }
  }

  const carregarTudo = async () => {
    setCarregando(true);
    try {
      setProjetos(await listarProjetos());
      setLixeira(await listarLixeira());
    }
    catch (e) { console.error('Erro ao listar projetos:', e); }
    finally { setCarregando(false); }
  };

  // ao abrir a tela, limpa da lixeira o que já passou do prazo, depois carrega tudo
  useEffect(() => { purgarLixeiraAntiga(DIAS_LIXEIRA).catch(() => {}).finally(() => carregarTudo()); }, []);

  async function restaurar(id: string) {
    await restaurarProjeto(id);
    carregarTudo();
  }
  async function apagarDeVez(id: string, nome: string) {
    if (!(await confirmar({ titulo: 'Apagar de vez', mensagem: `Apagar DE VEZ o projeto "${nome}"? Isso não tem mais como desfazer.`, okLabel: 'Apagar de vez', perigo: true }))) return;
    await excluirDefinitivo(id);
    carregarTudo();
  }
  function diasRestantes(excluidoEm?: number): number {
    const passados = (Date.now() - (excluidoEm ?? 0)) / (24 * 60 * 60 * 1000);
    return Math.max(0, Math.ceil(DIAS_LIXEIRA - passados));
  }

  const tecnico = useMemo(() => carregarTecnico(), []);

  const linhas = useMemo(() => {
    // um projeto com dados corrompidos não pode derrubar o painel inteiro nem esconder os outros
    return projetos.flatMap((p) => {
      try {
        const m = migrarProjeto(p);
        const vertices = m.glebas.flatMap((g) => g.vertices);
        const confrontantes = m.glebas.flatMap((g) => g.confrontantes);
        // conferência POR GLEBA: vértices de divisa compartilhados entre glebas vizinhas têm o
        // mesmo código SIGEF de propósito — juntar tudo numa lista acusaria "código repetido" à toa.
        const conferencia = conferirProjetoGlebas(m.imovel, m.glebas, tecnico);
        return [{ projeto: m, vertices, confrontantes, pronto: conferencia.graves.length === 0 }];
      } catch (e) {
        console.error(`Projeto "${p?.nome ?? p?.id}" com dados inesperados — pulado no painel:`, e);
        return [];
      }
    });
  }, [projetos, tecnico]);

  const filtradas = useMemo(() => {
    const q = normalizar(busca);
    return linhas
      .filter(({ projeto, pronto }) => {
        if (filtro === 'prontos' && !pronto) return false;
        if (filtro === 'incompletos' && pronto) return false;
        if (!q) return true;
        return (
          normalizar(projeto.nome).includes(q) ||
          normalizar(projeto.imovel.proprietario).includes(q) ||
          normalizar(projeto.imovel.denominacao).includes(q) ||
          normalizar(projeto.imovel.matricula).includes(q) ||
          normalizar(projeto.imovel.municipio).includes(q)
        );
      })
      .sort((a, b) => (b.projeto.atualizadoEm ?? 0) - (a.projeto.atualizadoEm ?? 0));
  }, [linhas, busca, filtro]);

  async function remover(id: string, nome: string) {
    if (!(await confirmar({ titulo: 'Enviar para a lixeira', mensagem: `Enviar o projeto "${nome}" para a lixeira? Você pode restaurá-lo por ${DIAS_LIXEIRA} dias.`, okLabel: 'Enviar para a lixeira' }))) return;
    await excluirProjeto(id);
    carregarTudo();
  }

  const totalPronto = linhas.filter((l) => l.pronto).length;

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm" className="h-9 px-3">
              <ArrowLeft className="size-4" /> Voltar
            </Button>
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Projetos</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden sm:inline text-xs text-muted-foreground">{linhas.length} projeto(s) · {totalPronto} pronto(s) para exportar</span>
          <Button size="sm" variant={verLixeira ? 'default' : 'outline'} className="h-9 gap-1.5 px-3 text-xs" onClick={() => setVerLixeira((v) => !v)} title="Projetos excluídos (restauráveis por um prazo)">
            <Trash2 className="size-4" /> Lixeira{lixeira.length ? ` (${lixeira.length})` : ''}
          </Button>
          <label className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs cursor-pointer shadow-xs transition-all" title="Criar um novo projeto importando uma planilha oficial ODS do SIGEF/INCRA">
            <FileSpreadsheet className="size-4" />
            <span>Importar ODS</span>
            <input type="file" accept=".ods" onChange={handleImportarOds} className="hidden" />
          </label>
          <Button size="sm" variant="outline" className="h-9 gap-1.5 px-3 text-xs" disabled={gerandoBackup || linhas.length === 0} onClick={baixarBackup} title="Baixa um zip com todos os projetos e arquivos anexados">
            <DownloadCloud className="size-4" /> {gerandoBackup ? 'Gerando…' : 'Backup completo'}
          </Button>
        </div>
      </div>

      {!verLixeira && (
        <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Buscar por nome, proprietário, matrícula, município…"
              className="pl-9 h-10 text-sm" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {(['todos', 'prontos', 'incompletos'] as FiltroStatus[]).map((f) => (
              <Button key={f} size="sm" variant={filtro === f ? 'default' : 'outline'} onClick={() => setFiltro(f)} className="capitalize h-10 px-4 sm:h-9 sm:px-3 text-xs">
                {f}
              </Button>
            ))}
          </div>
        </div>
      )}

      {verLixeira ? (
        <div className="space-y-2">
          {lixeira.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">A lixeira está vazia. Projetos excluídos ficam aqui por {DIAS_LIXEIRA} dias antes da limpeza definitiva.</div>
          ) : (
            lixeira.map((p) => (
              <div key={p.id} className="flex flex-col gap-3 rounded-md border border-dashed bg-card p-3.5 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-base sm:text-sm">{p.nome}</div>
                  <div className="truncate text-xs text-muted-foreground">{p.imovel.proprietario || 'Sem proprietário'} · {p.imovel.municipio || 'Sem município'}</div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Excluído em {new Date(p.excluidoEm ?? 0).toLocaleDateString('pt-BR')} · restaura por mais {diasRestantes(p.excluidoEm)} dia(s)</div>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:gap-1.5">
                  <Button size="sm" variant="outline" className="h-10 sm:h-8 px-4 sm:px-3 gap-1.5 text-xs" title="Restaurar este projeto" onClick={() => restaurar(p.id)}>
                    <RotateCcw className="size-4 sm:size-3.5" /> Restaurar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-10 w-10 sm:h-8 sm:w-8 p-0" title="Apagar de vez" aria-label={`Apagar de vez o projeto ${p.nome}`} onClick={() => apagarDeVez(p.id, p.nome)}>
                    <XCircle className="size-4 sm:size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {carregando ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : filtradas.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {projetos.length === 0 ? 'Nenhum projeto salvo ainda.' : 'Nenhum projeto encontrado para essa busca/filtro.'}
            </div>
          ) : (
            filtradas.map(({ projeto: p, vertices, pronto }) => (
              <div key={p.id} className="flex flex-col gap-3 rounded-md border bg-card p-3.5 text-sm sm:flex-row sm:items-center sm:justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-base sm:text-sm">{p.nome}</span>
                    {pronto ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3" /> Pronto
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="size-3" /> Incompleto
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground mt-0.5">
                    {p.imovel.proprietario || 'Sem proprietário'} · {p.imovel.municipio || 'Sem município'} · {vertices.length} vértice(s)
                    {p.glebas.length > 1 ? ` · ${p.glebas.length} glebas` : ''}
                  </div>
                  {p.atualizadoEm ? (
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Atualizado em {new Date(p.atualizadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:gap-1.5 justify-end mt-2 sm:mt-0">
                  <Link href={`/?projetoId=${p.id}`}>
                    <Button size="sm" variant="outline" className="h-10 sm:h-8 px-4 sm:px-3 gap-1.5 text-xs" title="Abrir este projeto no editor">
                      <FolderOpen className="size-4 sm:size-3.5" /> Abrir
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" className="h-10 w-10 sm:h-8 sm:w-8 p-0" title="Renomear" aria-label={`Renomear o projeto ${p.nome}`} onClick={() => renomear(p)}>
                    <Pencil className="size-4 sm:size-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-10 w-10 sm:h-8 sm:w-8 p-0" disabled={exportandoId === p.id} title="Exportar este projeto (dados + arquivos anexados) em .zip" aria-label={`Exportar o projeto ${p.nome}`} onClick={() => exportarProjeto(p)}>
                    <Download className={`size-4 sm:size-3.5 ${exportandoId === p.id ? 'animate-pulse' : ''}`} />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-10 w-10 sm:h-8 sm:w-8 p-0" title="Excluir" aria-label={`Excluir o projeto ${p.nome}`} onClick={() => remover(p.id, p.nome)}>
                    <Trash2 className="size-4 sm:size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
