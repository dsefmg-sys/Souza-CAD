'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import type { ProprietarioCad, ConfrontanteCad, ImovelCad, CartorioCad } from '@/lib/topo/types';
import { proprietarios, confrontantesCad, imoveisCad, cartoriosCad } from '@/lib/store/cadastros';

type Aba = 'proprietarios' | 'confrontantes' | 'imoveis' | 'cartorios';

export default function CadastrosPage() {
  const [aba, setAba] = useState<Aba>('proprietarios');
  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/"><Button variant="ghost" size="sm"><ArrowLeft /> Voltar</Button></Link>
        <h1 className="text-xl font-semibold">Cadastros</h1>
      </div>
      <div className="mb-4 flex gap-1 border-b">
        {(['proprietarios', 'confrontantes', 'imoveis', 'cartorios'] as Aba[]).map((a) => (
          <button key={a} onClick={() => setAba(a)}
            className={`px-3 py-2 text-sm capitalize ${aba === a ? 'border-b-2 border-primary font-medium text-primary' : 'text-muted-foreground'}`}>
            {a === 'proprietarios' ? 'Proprietários' : a === 'confrontantes' ? 'Confrontantes' : a === 'imoveis' ? 'Imóveis' : 'Cartórios'}
          </button>
        ))}
      </div>
      {aba === 'proprietarios' && <Proprietarios />}
      {aba === 'confrontantes' && <Confrontantes />}
      {aba === 'imoveis' && <Imoveis />}
      {aba === 'cartorios' && <Cartorios />}
    </div>
  );
}

function campo(label: string, value: string, onChange: (v: string) => void) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Proprietarios() {
  const vazio: ProprietarioCad = { id: '', nome: '', cpf: '', tipoPessoa: 'Física' };
  const [lista, setLista] = useState<ProprietarioCad[]>([]);
  const [form, setForm] = useState<ProprietarioCad>(vazio);
  const carregar = () => proprietarios.listar().then(setLista).catch(() => {});
  useEffect(() => { carregar(); }, []);
  async function salvar() { if (!form.nome) return; await proprietarios.salvar(form); setForm(vazio); carregar(); }
  async function excluir(id: string) { await proprietarios.excluir(id); carregar(); }
  return (
    <div className="space-y-4">
      <Card><CardContent className="grid grid-cols-2 gap-3 p-4">
        {campo('Nome', form.nome, (v) => setForm({ ...form, nome: v }))}
        {campo('CPF/CNPJ', form.cpf, (v) => setForm({ ...form, cpf: v }))}
        <div className="col-span-2"><Button size="sm" onClick={salvar}><Plus /> {form.id ? 'Atualizar' : 'Adicionar'}</Button></div>
      </CardContent></Card>
      <div className="space-y-1">
        {lista.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded border p-2 text-sm">
            <span onClick={() => setForm(p)} className="cursor-pointer">{p.nome} — {p.cpf}</span>
            <Button size="sm" variant="ghost" onClick={() => excluir(p.id)}><Trash2 /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Confrontantes() {
  const vazio: ConfrontanteCad = { id: '', nome: '', cpf: '', matricula: '', cns: '', descricaoExtra: '' };
  const [lista, setLista] = useState<ConfrontanteCad[]>([]);
  const [form, setForm] = useState<ConfrontanteCad>(vazio);
  const carregar = () => confrontantesCad.listar().then(setLista).catch(() => {});
  useEffect(() => { carregar(); }, []);
  async function salvar() { if (!form.nome) return; await confrontantesCad.salvar(form); setForm(vazio); carregar(); }
  async function excluir(id: string) { await confrontantesCad.excluir(id); carregar(); }
  return (
    <div className="space-y-4">
      <Card><CardContent className="grid grid-cols-2 gap-3 p-4">
        {campo('Nome', form.nome, (v) => setForm({ ...form, nome: v }))}
        {campo('CPF/CNPJ', form.cpf, (v) => setForm({ ...form, cpf: v }))}
        {campo('Matrícula', form.matricula, (v) => setForm({ ...form, matricula: v }))}
        {campo('Cartório (CNS)', form.cns, (v) => setForm({ ...form, cns: v }))}
        <div className="col-span-2">{campo('Descrição extra (espólio/inventariante)', form.descricaoExtra ?? '', (v) => setForm({ ...form, descricaoExtra: v }))}</div>
        <div className="col-span-2"><Button size="sm" onClick={salvar}><Plus /> {form.id ? 'Atualizar' : 'Adicionar'}</Button></div>
      </CardContent></Card>
      <div className="space-y-1">
        {lista.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded border p-2 text-sm">
            <span onClick={() => setForm(c)} className="cursor-pointer">{c.nome} — {c.cpf} — Mat. {c.matricula}</span>
            <Button size="sm" variant="ghost" onClick={() => excluir(c.id)}><Trash2 /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Cartorios() {
  const vazio: CartorioCad = { id: '', cns: '', nome: '', municipio: '' };
  const [lista, setLista] = useState<CartorioCad[]>([]);
  const [form, setForm] = useState<CartorioCad>(vazio);
  const carregar = () => cartoriosCad.listar().then(setLista).catch(() => {});
  useEffect(() => { carregar(); }, []);
  async function salvar() { if (!form.cns) return; await cartoriosCad.salvar(form); setForm(vazio); carregar(); }
  async function excluir(id: string) { await cartoriosCad.excluir(id); carregar(); }
  return (
    <div className="space-y-4">
      <Card><CardContent className="grid grid-cols-2 gap-3 p-4">
        {campo('CNS (código do cartório)', form.cns, (v) => setForm({ ...form, cns: v }))}
        {campo('Município', form.municipio, (v) => setForm({ ...form, municipio: v }))}
        <div className="col-span-2">{campo('Nome do cartório', form.nome, (v) => setForm({ ...form, nome: v }))}</div>
        <div className="col-span-2"><Button size="sm" onClick={salvar}><Plus /> {form.id ? 'Atualizar' : 'Adicionar'}</Button></div>
      </CardContent></Card>
      <div className="space-y-1">
        {lista.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded border p-2 text-sm">
            <span onClick={() => setForm(c)} className="cursor-pointer">{c.cns} — {c.nome} {c.municipio ? `(${c.municipio})` : ''}</span>
            <Button size="sm" variant="ghost" onClick={() => excluir(c.id)}><Trash2 /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Imoveis() {
  const vazio: ImovelCad = { id: '', denominacao: '', matricula: '', cns: '', codigoImovelIncra: '', municipio: '' };
  const [lista, setLista] = useState<ImovelCad[]>([]);
  const [form, setForm] = useState<ImovelCad>(vazio);
  const carregar = () => imoveisCad.listar().then(setLista).catch(() => {});
  useEffect(() => { carregar(); }, []);
  async function salvar() { if (!form.denominacao) return; await imoveisCad.salvar(form); setForm(vazio); carregar(); }
  async function excluir(id: string) { await imoveisCad.excluir(id); carregar(); }
  return (
    <div className="space-y-4">
      <Card><CardContent className="grid grid-cols-2 gap-3 p-4">
        {campo('Denominação', form.denominacao, (v) => setForm({ ...form, denominacao: v }))}
        {campo('Matrícula', form.matricula, (v) => setForm({ ...form, matricula: v }))}
        {campo('Cartório (CNS)', form.cns, (v) => setForm({ ...form, cns: v }))}
        {campo('Código INCRA', form.codigoImovelIncra, (v) => setForm({ ...form, codigoImovelIncra: v }))}
        <div className="col-span-2">{campo('Município', form.municipio, (v) => setForm({ ...form, municipio: v }))}</div>
        <div className="col-span-2"><Button size="sm" onClick={salvar}><Plus /> {form.id ? 'Atualizar' : 'Adicionar'}</Button></div>
      </CardContent></Card>
      <div className="space-y-1">
        {lista.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded border p-2 text-sm">
            <span onClick={() => setForm(m)} className="cursor-pointer">{m.denominacao} — Mat. {m.matricula} — {m.municipio}</span>
            <Button size="sm" variant="ghost" onClick={() => excluir(m.id)}><Trash2 /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
