'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Search, Link2, Edit, FolderInput } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import type { ProprietarioCad, ConfrontanteCad, ImovelCad, CartorioCad } from '@/lib/topo/types';
import { proprietarios, confrontantesCad, imoveisCad, cartoriosCad } from '@/lib/store/cadastros';
import { carregarProjeto } from '@/lib/store/projects';
import { cpfValido, cnpjValido } from '@/lib/topo/validation';
import { useAuth } from '@/lib/firebase/auth';

type Aba = 'proprietarios' | 'confrontantes' | 'imoveis' | 'cartorios' | 'global';

const normalizarTexto = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

function CampoBusca({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input type="search" placeholder={placeholder} className="pl-8" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// Enfileira um cadastro para inserir no projeto aberto e volta ao editor (que aplica a fila).
// O editor guarda o trabalho automaticamente, então voltar não perde nada.
// Chave com o uid (mesmo esquema de metrica.rascunho:${uid}): sem isso, num navegador
// compartilhado, a fila de um usuário podia ser aplicada na conta de outro que logasse depois.
type TipoInsercao = 'prop' | 'conf' | 'imovel' | 'cartorio';
function enviarParaProjeto(tipo: TipoInsercao, item: unknown, uid: string | undefined) {
  try {
    const chave = `metrica.filaInserir:${uid ?? 'local'}`;
    const raw = localStorage.getItem(chave);
    const fila = raw ? JSON.parse(raw) : [];
    fila.push({ tipo, item });
    localStorage.setItem(chave, JSON.stringify(fila));
  } catch { /* ignore */ }
  window.location.href = '/';
}
function BtnInserir({ tipo, item }: { tipo: TipoInsercao; item: unknown }) {
  const { user } = useAuth();
  return (
    <Button size="sm" variant="outline" className="h-8 shrink-0 gap-1" title="Inserir no projeto aberto (volta ao editor)" onClick={() => enviarParaProjeto(tipo, item, user?.uid)}>
      <FolderInput className="h-3.5 w-3.5" /> Inserir no projeto
    </Button>
  );
}

export default function CadastrosPage() {
  const [aba, setAba] = useState<Aba>('proprietarios');
  const [projetoId, setProjetoId] = useState<string | null>(null);
  const [nomeProjeto, setNomeProjeto] = useState<string>('');

  const [propsList, setPropsList] = useState<ProprietarioCad[]>([]);
  const [confsList, setConfsList] = useState<ConfrontanteCad[]>([]);
  const [imoveisList, setImoveisList] = useState<ImovelCad[]>([]);
  const [cartoriosList, setCartoriosList] = useState<CartorioCad[]>([]);
  const [sugCns, setSugCns] = useState<string[]>([]);

  // Presets para edição vindos da busca global
  const [presetProp, setPresetProp] = useState<ProprietarioCad | null>(null);
  const [presetConf, setPresetConf] = useState<ConfrontanteCad | null>(null);
  const [presetImovel, setPresetImovel] = useState<ImovelCad | null>(null);
  const [presetCartorio, setPresetCartorio] = useState<CartorioCad | null>(null);

  const carregarTudo = async () => {
    try {
      const p = await proprietarios.listar();
      const c = await confrontantesCad.listar();
      const i = await imoveisCad.listar();
      const ca = await cartoriosCad.listar();
      setPropsList(p);
      setConfsList(c);
      setImoveisList(i);
      setCartoriosList(ca);
      setSugCns(ca.map((x) => x.cns).filter(Boolean));
    } catch (e) {
      console.error('Erro ao carregar cadastros:', e);
    }
  };

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('projetoId');
    if (id) {
      setProjetoId(id);
      carregarProjeto(id).then((p) => {
        if (p) setNomeProjeto(p.nome);
      }).catch(() => {});
    }
    carregarTudo();
  }, []);

  const editarProprietarioGlobal = (p: ProprietarioCad) => {
    setPresetProp(p);
    setAba('proprietarios');
  };

  const editarConfrontanteGlobal = (c: ConfrontanteCad) => {
    setPresetConf(c);
    setAba('confrontantes');
  };

  const editarImovelGlobal = (i: ImovelCad) => {
    setPresetImovel(i);
    setAba('imoveis');
  };

  const editarCartorioGlobal = (c: CartorioCad) => {
    setPresetCartorio(c);
    setAba('cartorios');
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href="/"><Button variant="ghost" size="sm"><ArrowLeft /> Voltar</Button></Link>
          <h1 className="text-xl font-semibold">Cadastros</h1>
        </div>
        {nomeProjeto && (
          <span className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 font-medium">
            Projeto Ativo: {nomeProjeto}
          </span>
        )}
      </div>

      <div className="mb-4 flex gap-1 border-b overflow-x-auto whitespace-nowrap">
        {(['proprietarios', 'confrontantes', 'imoveis', 'cartorios', 'global'] as Aba[]).map((a) => (
          <button key={a} onClick={() => setAba(a)}
            className={`px-3 py-2 text-sm capitalize ${aba === a ? 'border-b-2 border-primary font-medium text-primary' : 'text-muted-foreground'}`}>
            {a === 'proprietarios' ? 'Proprietários' : a === 'confrontantes' ? 'Confrontantes' : a === 'imoveis' ? 'Imóveis' : a === 'cartorios' ? 'Cartórios' : 'Busca Global'}
          </button>
        ))}
      </div>

      {aba === 'proprietarios' && (
        <Proprietarios
          projetoId={projetoId}
          propsList={propsList}
          confsList={confsList}
          onRefresh={carregarTudo}
          preset={presetProp}
          onClearPreset={() => setPresetProp(null)}
        />
      )}
      {aba === 'confrontantes' && (
        <Confrontantes
          projetoId={projetoId}
          propsList={propsList}
          confsList={confsList}
          onRefresh={carregarTudo}
          preset={presetConf}
          onClearPreset={() => setPresetConf(null)}
        />
      )}
      {aba === 'imoveis' && (
        <Imoveis
          projetoId={projetoId}
          imoveisList={imoveisList}
          onRefresh={carregarTudo}
          preset={presetImovel}
          onClearPreset={() => setPresetImovel(null)}
        />
      )}
      {aba === 'cartorios' && (
        <Cartorios
          cartoriosList={cartoriosList}
          onRefresh={carregarTudo}
          preset={presetCartorio}
          onClearPreset={() => setPresetCartorio(null)}
        />
      )}
      {aba === 'global' && (
        <GlobalSearch
          projetoId={projetoId}
          propsList={propsList}
          confsList={confsList}
          imoveisList={imoveisList}
          cartoriosList={cartoriosList}
          onRefresh={carregarTudo}
          onEditarProp={editarProprietarioGlobal}
          onEditarConf={editarConfrontanteGlobal}
          onEditarImovel={editarImovelGlobal}
          onEditarCartorio={editarCartorioGlobal}
        />
      )}

      <datalist id="lista-cns">
        {cartoriosList.map((c) => (
          <option key={c.id} value={c.cns}>
            {c.nome} {c.municipio ? `(${c.municipio})` : ''}
          </option>
        ))}
      </datalist>
    </div>
  );
}

function campo(label: string, value: string, onChange: (v: string) => void, list?: string, aviso?: string) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} list={list} />
      {aviso && <span className="text-xs text-amber-500 font-medium block mt-0.5">{aviso}</span>}
    </div>
  );
}

interface TabProps<T> {
  projetoId?: string | null;
  onRefresh: () => void;
  preset: T | null;
  onClearPreset: () => void;
}

function Proprietarios({
  projetoId,
  propsList,
  confsList,
  onRefresh,
  preset,
  onClearPreset,
}: TabProps<ProprietarioCad> & { propsList: ProprietarioCad[]; confsList: ConfrontanteCad[] }) {
  const vazio: ProprietarioCad = { id: '', nome: '', cpf: '', tipoPessoa: 'Física' };
  const [form, setForm] = useState<ProprietarioCad>(vazio);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (preset) {
      setForm(preset);
      onClearPreset();
    }
  }, [preset]);

  async function salvar() {
    if (!form.nome) return;
    // Se o registro não tinha projetoId e estamos num projeto, associa
    const projetoIdSalvar = form.projetoId || projetoId || undefined;
    await proprietarios.salvar({ ...form, projetoId: projetoIdSalvar });
    setForm(vazio);
    onRefresh();
  }

  async function excluir(id: string) {
    await proprietarios.excluir(id);
    onRefresh();
  }

  const cleanCpf = form.cpf.replace(/\D/g, '');
  let avisoCpf = '';
  if (cleanCpf.length === 11) {
    if (!cpfValido(cleanCpf)) {
      avisoCpf = 'CPF inválido (dígitos verificadores incorretos).';
    } else {
      const dupP = propsList.some((p) => p.id !== form.id && p.cpf.replace(/\D/g, '') === cleanCpf);
      const dupC = confsList.some((c) => c.cpf.replace(/\D/g, '') === cleanCpf);
      if (dupP || dupC) {
        avisoCpf = 'Aviso: CPF já cadastrado em outro proprietário ou confrontante.';
      }
    }
  } else if (cleanCpf.length === 14) {
    if (!cnpjValido(cleanCpf)) {
      avisoCpf = 'CNPJ inválido (dígitos verificadores incorretos).';
    } else {
      const dupP = propsList.some((p) => p.id !== form.id && p.cpf.replace(/\D/g, '') === cleanCpf);
      const dupC = confsList.some((c) => c.cpf.replace(/\D/g, '') === cleanCpf);
      if (dupP || dupC) {
        avisoCpf = 'Aviso: CNPJ já cadastrado em outro proprietário ou confrontante.';
      }
    }
  }

  const q = normalizarTexto(busca);
  const listaExibicao = propsList
    .filter((p) => !projetoId || p.projetoId === projetoId)
    .filter((p) => !q || normalizarTexto(p.nome).includes(q) || normalizarTexto(p.cpf).includes(q));

  return (
    <div className="space-y-4">
      <Card><CardContent className="grid grid-cols-2 gap-3 p-4">
        {campo('Nome', form.nome, (v) => setForm({ ...form, nome: v }))}
        {campo('CPF/CNPJ', form.cpf, (v) => setForm({ ...form, cpf: v }), undefined, avisoCpf)}
        <div className="col-span-2 flex gap-2">
          <Button size="sm" onClick={salvar}><Plus /> {form.id ? 'Atualizar' : 'Adicionar'}</Button>
          {form.id && <Button size="sm" variant="ghost" onClick={() => setForm(vazio)}>Cancelar</Button>}
        </div>
      </CardContent></Card>
      <CampoBusca value={busca} onChange={setBusca} placeholder="Buscar por nome ou CPF/CNPJ..." />
      <div className="space-y-1">
        {listaExibicao.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded border p-2 text-sm">
            <span onClick={() => setForm(p)} className="cursor-pointer font-medium hover:text-primary transition-colors">
              {p.nome} — {p.cpf}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <BtnInserir tipo="prop" item={p} />
              <Button size="sm" variant="ghost" onClick={() => excluir(p.id)}><Trash2 className="text-destructive h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        {listaExibicao.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            {busca ? 'Nenhum proprietário encontrado para essa busca.' : 'Nenhum proprietário associado a este projeto.'}
          </div>
        )}
      </div>
    </div>
  );
}

function Confrontantes({
  projetoId,
  propsList,
  confsList,
  onRefresh,
  preset,
  onClearPreset,
}: TabProps<ConfrontanteCad> & { propsList: ProprietarioCad[]; confsList: ConfrontanteCad[] }) {
  const vazio: ConfrontanteCad = { id: '', nome: '', cpf: '', matricula: '', cns: '', descricaoExtra: '', condicao: 'proprietario' };
  const [form, setForm] = useState<ConfrontanteCad>(vazio);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (preset) {
      setForm(preset);
      onClearPreset();
    }
  }, [preset]);

  async function salvar() {
    if (!form.nome) return;
    const projetoIdSalvar = form.projetoId || projetoId || undefined;
    await confrontantesCad.salvar({ ...form, projetoId: projetoIdSalvar });
    setForm(vazio);
    onRefresh();
  }

  async function excluir(id: string) {
    await confrontantesCad.excluir(id);
    onRefresh();
  }

  const cond = form.condicao ?? 'proprietario';

  // Validação CPF principal
  const cleanCpf = form.cpf.replace(/\D/g, '');
  let avisoCpf = '';
  if (cleanCpf.length === 11) {
    if (!cpfValido(cleanCpf)) {
      avisoCpf = 'CPF inválido (dígitos verificadores incorretos).';
    } else {
      const dupP = propsList.some((p) => p.cpf.replace(/\D/g, '') === cleanCpf);
      const dupC = confsList.some((c) => c.id !== form.id && c.cpf.replace(/\D/g, '') === cleanCpf);
      if (dupP || dupC) {
        avisoCpf = 'Aviso: CPF já cadastrado em outro proprietário ou confrontante.';
      }
    }
  } else if (cleanCpf.length === 14) {
    if (!cnpjValido(cleanCpf)) {
      avisoCpf = 'CNPJ inválido (dígitos verificadores incorretos).';
    } else {
      const dupP = propsList.some((p) => p.cpf.replace(/\D/g, '') === cleanCpf);
      const dupC = confsList.some((c) => c.id !== form.id && c.cpf.replace(/\D/g, '') === cleanCpf);
      if (dupP || dupC) {
        avisoCpf = 'Aviso: CNPJ já cadastrado em outro proprietário ou confrontante.';
      }
    }
  }

  // Validação cônjuge
  const cleanConj = (form.conjugeCpf || '').replace(/\D/g, '');
  let avisoConj = '';
  if (cleanConj.length === 11 && !cpfValido(cleanConj)) {
    avisoConj = 'CPF do cônjuge inválido.';
  }

  // Validação inventariante
  const cleanInv = (form.inventarianteCpf || '').replace(/\D/g, '');
  let avisoInv = '';
  if (cleanInv.length === 11 && !cpfValido(cleanInv)) {
    avisoInv = 'CPF do inventariante inválido.';
  }

  const qc = normalizarTexto(busca);
  const listaExibicao = confsList
    .filter((c) => !projetoId || c.projetoId === projetoId)
    .filter((c) => !qc || normalizarTexto(c.nome).includes(qc) || normalizarTexto(c.cpf).includes(qc) || normalizarTexto(c.matricula).includes(qc));

  return (
    <div className="space-y-4">
      <Card><CardContent className="grid grid-cols-2 gap-3 p-4">
        {campo('Nome', form.nome, (v) => setForm({ ...form, nome: v }))}
        {campo('CPF/CNPJ', form.cpf, (v) => setForm({ ...form, cpf: v }), undefined, avisoCpf)}
        <div className="space-y-1">
          <Label>Condição</Label>
          <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={cond} onChange={(e) => setForm({ ...form, condicao: e.target.value as ConfrontanteCad['condicao'] })}>
            <option value="proprietario">Proprietário</option>
            <option value="posseiro">Posseiro (sem matrícula)</option>
            <option value="espolio">Espólio (assina inventariante)</option>
          </select>
        </div>
        {cond !== 'posseiro' && campo('Matrícula', form.matricula, (v) => setForm({ ...form, matricula: v }))}
        {campo('Cartório (CNS)', form.cns, (v) => setForm({ ...form, cns: v }), 'lista-cns')}
        {cond === 'espolio' && campo('Inventariante', form.inventarianteNome ?? '', (v) => setForm({ ...form, inventarianteNome: v }))}
        {cond === 'espolio' && campo('CPF do inventariante', form.inventarianteCpf ?? '', (v) => setForm({ ...form, inventarianteCpf: v }), undefined, avisoInv)}
        {cond !== 'espolio' && campo('Cônjuge', form.conjugeNome ?? '', (v) => setForm({ ...form, conjugeNome: v }))}
        {cond !== 'espolio' && campo('CPF do cônjuge', form.conjugeCpf ?? '', (v) => setForm({ ...form, conjugeCpf: v }), undefined, avisoConj)}
        <div className="col-span-2">{campo('Descrição extra (sobrepõe o texto automático)', form.descricaoExtra ?? '', (v) => setForm({ ...form, descricaoExtra: v }))}</div>
        <div className="col-span-2 flex gap-2">
          <Button size="sm" onClick={salvar}><Plus /> {form.id ? 'Atualizar' : 'Adicionar'}</Button>
          {form.id && <Button size="sm" variant="ghost" onClick={() => setForm(vazio)}>Cancelar</Button>}
        </div>
      </CardContent></Card>
      <CampoBusca value={busca} onChange={setBusca} placeholder="Buscar por nome, CPF/CNPJ ou matrícula..." />
      <div className="space-y-1">
        {listaExibicao.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded border p-2 text-sm">
            <span onClick={() => setForm(c)} className="cursor-pointer font-medium hover:text-primary transition-colors">
              {c.nome} — {c.cpf} — Mat. {c.matricula}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <BtnInserir tipo="conf" item={c} />
              <Button size="sm" variant="ghost" onClick={() => excluir(c.id)}><Trash2 className="text-destructive h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        {listaExibicao.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            {busca ? 'Nenhum confrontante encontrado para essa busca.' : 'Nenhum confrontante associado a este projeto.'}
          </div>
        )}
      </div>
    </div>
  );
}

function Imoveis({
  projetoId,
  imoveisList,
  onRefresh,
  preset,
  onClearPreset,
}: TabProps<ImovelCad> & { imoveisList: ImovelCad[] }) {
  const vazio: ImovelCad = { id: '', denominacao: '', matricula: '', cns: '', codigoImovelIncra: '', municipio: '' };
  const [form, setForm] = useState<ImovelCad>(vazio);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (preset) {
      setForm(preset);
      onClearPreset();
    }
  }, [preset]);

  async function salvar() {
    if (!form.denominacao) return;
    const projetoIdSalvar = form.projetoId || projetoId || undefined;
    await imoveisCad.salvar({ ...form, projetoId: projetoIdSalvar });
    setForm(vazio);
    onRefresh();
  }

  async function excluir(id: string) {
    await imoveisCad.excluir(id);
    onRefresh();
  }

  const qi = normalizarTexto(busca);
  const listaExibicao = imoveisList
    .filter((i) => !projetoId || i.projetoId === projetoId)
    .filter((i) => !qi || normalizarTexto(i.denominacao).includes(qi) || normalizarTexto(i.matricula).includes(qi) || normalizarTexto(i.municipio).includes(qi));

  return (
    <div className="space-y-4">
      <Card><CardContent className="grid grid-cols-2 gap-3 p-4">
        {campo('Denominação', form.denominacao, (v) => setForm({ ...form, denominacao: v }))}
        {campo('Matrícula', form.matricula, (v) => setForm({ ...form, matricula: v }))}
        {campo('Cartório (CNS)', form.cns, (v) => setForm({ ...form, cns: v }), 'lista-cns')}
        {campo('Código INCRA', form.codigoImovelIncra, (v) => setForm({ ...form, codigoImovelIncra: v }))}
        <div className="col-span-2">{campo('Município', form.municipio, (v) => setForm({ ...form, municipio: v }))}</div>
        <div className="col-span-2 flex gap-2">
          <Button size="sm" onClick={salvar}><Plus /> {form.id ? 'Atualizar' : 'Adicionar'}</Button>
          {form.id && <Button size="sm" variant="ghost" onClick={() => setForm(vazio)}>Cancelar</Button>}
        </div>
      </CardContent></Card>
      <CampoBusca value={busca} onChange={setBusca} placeholder="Buscar por denominação, matrícula ou município..." />
      <div className="space-y-1">
        {listaExibicao.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded border p-2 text-sm">
            <span onClick={() => setForm(m)} className="cursor-pointer font-medium hover:text-primary transition-colors">
              {m.denominacao} — Mat. {m.matricula} — {m.municipio}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <BtnInserir tipo="imovel" item={m} />
              <Button size="sm" variant="ghost" onClick={() => excluir(m.id)}><Trash2 className="text-destructive h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        {listaExibicao.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            {busca ? 'Nenhum imóvel encontrado para essa busca.' : 'Nenhum imóvel associado a este projeto.'}
          </div>
        )}
      </div>
    </div>
  );
}

function Cartorios({
  cartoriosList,
  onRefresh,
  preset,
  onClearPreset,
}: Omit<TabProps<CartorioCad>, 'projetoId'> & { cartoriosList: CartorioCad[] }) {
  const vazio: CartorioCad = { id: '', cns: '', nome: '', municipio: '' };
  const [form, setForm] = useState<CartorioCad>(vazio);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (preset) {
      setForm(preset);
      onClearPreset();
    }
  }, [preset]);

  async function salvar() {
    if (!form.cns) return;
    await cartoriosCad.salvar(form);
    setForm(vazio);
    onRefresh();
  }

  async function excluir(id: string) {
    await cartoriosCad.excluir(id);
    onRefresh();
  }

  const qCart = normalizarTexto(busca);
  const cartoriosFiltrados = cartoriosList.filter((c) => !qCart || normalizarTexto(c.cns).includes(qCart) || normalizarTexto(c.nome).includes(qCart) || normalizarTexto(c.municipio).includes(qCart));

  return (
    <div className="space-y-4">
      <Card><CardContent className="grid grid-cols-2 gap-3 p-4">
        {campo('CNS (código do cartório)', form.cns, (v) => setForm({ ...form, cns: v }))}
        {campo('Município', form.municipio, (v) => setForm({ ...form, municipio: v }))}
        <div className="col-span-2">{campo('Nome do cartório', form.nome, (v) => setForm({ ...form, nome: v }))}</div>
        <div className="col-span-2 flex gap-2">
          <Button size="sm" onClick={salvar}><Plus /> {form.id ? 'Atualizar' : 'Adicionar'}</Button>
          {form.id && <Button size="sm" variant="ghost" onClick={() => setForm(vazio)}>Cancelar</Button>}
        </div>
      </CardContent></Card>
      <CampoBusca value={busca} onChange={setBusca} placeholder="Buscar por CNS, nome ou município..." />
      <div className="space-y-1">
        {cartoriosFiltrados.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded border p-2 text-sm">
            <span onClick={() => setForm(c)} className="cursor-pointer font-medium hover:text-primary transition-colors">
              {c.cns} — {c.nome} {c.municipio ? `(${c.municipio})` : ''}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <BtnInserir tipo="cartorio" item={c} />
              <Button size="sm" variant="ghost" onClick={() => excluir(c.id)}><Trash2 className="text-destructive h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        {cartoriosFiltrados.length === 0 && busca && (
          <div className="text-center py-6 text-sm text-muted-foreground">Nenhum cartório encontrado para essa busca.</div>
        )}
      </div>
    </div>
  );
}

interface GlobalSearchProps {
  projetoId: string | null;
  propsList: ProprietarioCad[];
  confsList: ConfrontanteCad[];
  imoveisList: ImovelCad[];
  cartoriosList: CartorioCad[];
  onRefresh: () => void;
  onEditarProp: (p: ProprietarioCad) => void;
  onEditarConf: (c: ConfrontanteCad) => void;
  onEditarImovel: (i: ImovelCad) => void;
  onEditarCartorio: (c: CartorioCad) => void;
}

function GlobalSearch({
  projetoId,
  propsList,
  confsList,
  imoveisList,
  cartoriosList,
  onRefresh,
  onEditarProp,
  onEditarConf,
  onEditarImovel,
  onEditarCartorio,
}: GlobalSearchProps) {
  const [busca, setBusca] = useState('');
  const normalizar = normalizarTexto;

  const q = normalizar(busca);

  const propsFiltrados = propsList.filter((p) =>
    normalizar(p.nome).includes(q) || normalizar(p.cpf).includes(q)
  );

  const confsFiltrados = confsList.filter((c) =>
    normalizar(c.nome).includes(q) ||
    normalizar(c.cpf).includes(q) ||
    normalizar(c.matricula).includes(q) ||
    normalizar(c.cns).includes(q)
  );

  const imoveisFiltrados = imoveisList.filter((i) =>
    normalizar(i.denominacao).includes(q) ||
    normalizar(i.matricula).includes(q) ||
    normalizar(i.cns).includes(q) ||
    normalizar(i.codigoImovelIncra).includes(q) ||
    normalizar(i.municipio).includes(q)
  );

  const cartoriosFiltrados = cartoriosList.filter((c) =>
    normalizar(c.cns).includes(q) ||
    normalizar(c.nome).includes(q) ||
    normalizar(c.municipio).includes(q)
  );

  async function vincularProp(p: ProprietarioCad) {
    await proprietarios.salvar({ ...p, projetoId: projetoId || undefined });
    onRefresh();
  }

  async function vincularConf(c: ConfrontanteCad) {
    await confrontantesCad.salvar({ ...c, projetoId: projetoId || undefined });
    onRefresh();
  }

  async function vincularImovel(i: ImovelCad) {
    await imoveisCad.salvar({ ...i, projetoId: projetoId || undefined });
    onRefresh();
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Busca global (ignora acentos)..."
          className="pl-8"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="space-y-6">
        {/* Proprietários */}
        {propsFiltrados.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Proprietários ({propsFiltrados.length})
            </h3>
            <div className="divide-y rounded-md border bg-card">
              {propsFiltrados.map((p) => {
                const noProjeto = projetoId && p.projetoId === projetoId;
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <div className="font-medium">{p.nome}</div>
                      <div className="text-xs text-muted-foreground">CPF/CNPJ: {p.cpf}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {projetoId && !noProjeto && (
                        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => vincularProp(p)}>
                          <Link2 className="h-3 w-3" /> Vincular
                        </Button>
                      )}
                      {projetoId && noProjeto && (
                        <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium px-2 py-1 rounded">
                          No projeto
                        </span>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEditarProp(p)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Confrontantes */}
        {confsFiltrados.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Confrontantes ({confsFiltrados.length})
            </h3>
            <div className="divide-y rounded-md border bg-card">
              {confsFiltrados.map((c) => {
                const noProjeto = projetoId && c.projetoId === projetoId;
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <div className="font-medium">{c.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        CPF/CNPJ: {c.cpf} | Mat.: {c.matricula || 'Sem matrícula'} | CNS: {c.cns || 'Sem cartório'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {projetoId && !noProjeto && (
                        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => vincularConf(c)}>
                          <Link2 className="h-3 w-3" /> Vincular
                        </Button>
                      )}
                      {projetoId && noProjeto && (
                        <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium px-2 py-1 rounded">
                          No projeto
                        </span>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEditarConf(c)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Imóveis */}
        {imoveisFiltrados.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Imóveis ({imoveisFiltrados.length})
            </h3>
            <div className="divide-y rounded-md border bg-card">
              {imoveisFiltrados.map((i) => {
                const noProjeto = projetoId && i.projetoId === projetoId;
                return (
                  <div key={i.id} className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <div className="font-medium">{i.denominacao}</div>
                      <div className="text-xs text-muted-foreground">
                        Mat.: {i.matricula} | INCRA: {i.codigoImovelIncra} | {i.municipio}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {projetoId && !noProjeto && (
                        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => vincularImovel(i)}>
                          <Link2 className="h-3 w-3" /> Vincular
                        </Button>
                      )}
                      {projetoId && noProjeto && (
                        <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium px-2 py-1 rounded">
                          No projeto
                        </span>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEditarImovel(i)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cartórios */}
        {cartoriosFiltrados.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Cartórios ({cartoriosFiltrados.length})
            </h3>
            <div className="divide-y rounded-md border bg-card">
              {cartoriosFiltrados.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <div className="font-medium">{c.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      CNS: {c.cns} | {c.municipio}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEditarCartorio(c)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {busca &&
          propsFiltrados.length === 0 &&
          confsFiltrados.length === 0 &&
          imoveisFiltrados.length === 0 &&
          cartoriosFiltrados.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Nenhum registro encontrado para "{busca}".
            </div>
          )}
      </div>
    </div>
  );
}
