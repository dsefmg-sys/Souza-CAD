'use client';

import { useEffect, useState } from 'react';
import { saveAs } from 'file-saver';
import { FileSignature } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ImovelData, TecnicoData, PessoaQualificada, ProprietarioCad } from '@/lib/topo/types';
import { gerarRequerimentoDocx } from '@/lib/export/requerimento';
import { numBR } from '@/lib/topo/geometry';

export const PESSOA_VAZIA: PessoaQualificada = {
  nome: '', rg: '', cpf: '', nacionalidade: 'Brasileira', naturalidade: '', dataNascimento: '',
  filiacao: '', profissao: '', estadoCivil: '', conjugeNome: '', conjugeRg: '', conjugeCpf: '',
  endereco: '', cidadeUf: '', cep: '',
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imovel: ImovelData;
  onChangeImovel: (i: ImovelData) => void;
  tecnico: TecnicoData | null;
  areaRealHa: number;
  requerente?: PessoaQualificada;
  transmitente?: PessoaQualificada;
  onChangePessoas: (req: PessoaQualificada, trans: PessoaQualificada) => void;
  sugProp: ProprietarioCad[];
  onBaixar?: () => void;
}

const CAMPOS: { k: keyof PessoaQualificada; label: string; wide?: boolean }[] = [
  { k: 'nome', label: 'Nome', wide: true },
  { k: 'rg', label: 'RG' },
  { k: 'cpf', label: 'CPF' },
  { k: 'nacionalidade', label: 'Nacionalidade' },
  { k: 'naturalidade', label: 'Naturalidade' },
  { k: 'dataNascimento', label: 'Data de Nascimento' },
  { k: 'profissao', label: 'Profissão' },
  { k: 'estadoCivil', label: 'Estado Civil' },
  { k: 'filiacao', label: 'Filiação', wide: true },
  { k: 'conjugeNome', label: 'Cônjuge' },
  { k: 'conjugeCpf', label: 'CPF do cônjuge' },
  { k: 'endereco', label: 'Residente e domiciliado em', wide: true },
  { k: 'cidadeUf', label: 'Cidade/UF' },
  { k: 'cep', label: 'CEP' },
];

function Bloco({ titulo, pessoa, onChange, sugProp }: { titulo: string; pessoa: PessoaQualificada; onChange: (p: PessoaQualificada) => void; sugProp: ProprietarioCad[] }) {
  function setNome(v: string) {
    const m = sugProp.find((s) => s.nome === v);
    onChange(m ? { ...pessoa, ...m, nome: v } as PessoaQualificada : { ...pessoa, nome: v });
  }
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{titulo}</h3>
      <div className="grid grid-cols-2 gap-2">
        {CAMPOS.map((c) => (
          <div key={c.k} className={`space-y-1 ${c.wide ? 'col-span-2' : ''}`}>
            <Label>{c.label}</Label>
            {c.k === 'nome'
              ? <Input list="lista-pessoas" value={pessoa.nome} onChange={(e) => setNome(e.target.value)} />
              : <Input value={pessoa[c.k]} onChange={(e) => onChange({ ...pessoa, [c.k]: e.target.value })} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function transVazio(imovel: ImovelData): PessoaQualificada {
  return { ...PESSOA_VAZIA, nome: imovel.proprietario, cpf: imovel.cpfProprietario, cidadeUf: imovel.municipio || '' };
}

export default function RequerimentoModal({ open, onOpenChange, imovel, onChangeImovel, tecnico, areaRealHa, requerente, transmitente, onChangePessoas, sugProp, onBaixar }: Props) {
  const [req, setReq] = useState<PessoaQualificada>(requerente ?? PESSOA_VAZIA);
  const [trans, setTrans] = useState<PessoaQualificada>(transmitente ?? transVazio(imovel));
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (open) {
      setReq(requerente ?? PESSOA_VAZIA);
      setTrans(transmitente ?? transVazio(imovel));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function gerar() {
    if (!tecnico) { setMsg('Configure o técnico primeiro.'); return; }
    if (!req.nome?.trim() || !trans.nome?.trim()) { setMsg('Preencha o nome do requerente e do transmitente.'); return; }
    if (!req.cpf?.trim() || !trans.cpf?.trim()) { setMsg('Preencha o CPF/CNPJ do requerente e do transmitente.'); return; }
    onChangePessoas(req, trans);
    const blob = await gerarRequerimentoDocx({ imovel, tecnico, requerente: req, transmitente: trans, areaRealHa, dataExtenso: dataExtensoHoje() });
    saveAs(blob, `Requerimento - ${imovel.denominacao || 'imovel'}.docx`);
    onBaixar?.();
    setMsg('Requerimento gerado.');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Requerimento ao cartório (retificação de área)</DialogTitle>
        </DialogHeader>
        <datalist id="lista-pessoas">{sugProp.map((p) => <option key={p.id} value={p.nome} />)}</datalist>

        <div className="grid grid-cols-2 gap-3 rounded border bg-muted/30 p-3 text-sm">
          <div><b>Imóvel:</b> {imovel.denominacao || '—'} · Matrícula {imovel.matricula || '—'}</div>
          <div><b>Área real (levantada):</b> {numBR(areaRealHa, 4)} ha</div>
          <div className="space-y-1">
            <Label>Área anterior na matrícula (ha)</Label>
            <Input type="number" step="0.0001" value={imovel.areaAnterior ?? ''} onChange={(e) => onChangeImovel({ ...imovel, areaAnterior: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
          <div className="space-y-1">
            <Label>Valor do imóvel (R$)</Label>
            <Input type="number" step="0.01" value={imovel.valorImovel ?? ''} onChange={(e) => onChangeImovel({ ...imovel, valorImovel: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
        </div>

        <Bloco titulo="Requerente (adquirente / comprador)" pessoa={req} onChange={setReq} sugProp={sugProp} />
        <Bloco titulo="Proprietário registral (transmitente / vendedor)" pessoa={trans} onChange={setTrans} sugProp={sugProp} />

        <div className="flex items-center gap-3 border-t pt-3">
          <Button onClick={gerar}><FileSignature /> Gerar requerimento (.docx)</Button>
          {msg && <span className="text-sm text-primary">{msg}</span>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
function dataExtensoHoje(d = new Date()): string {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
