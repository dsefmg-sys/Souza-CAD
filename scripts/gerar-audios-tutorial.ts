// Gera os áudios narrados do tutorial (passos + temas) usando a API de voz do Gemini.
// Roda uma vez (ou de novo só quando o texto de um trecho mudar) — os áudios resultantes ficam
// em public/audio/tutorial e são servidos como arquivo estático, sem custo/latência por usuário.
//
// Uso: npx tsx scripts/gerar-audios-tutorial.ts --voz=Achird [--somente=id] [--force] [--dry]

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import { PASSOS_BASE, PASSOS_AVANCADOS } from '../src/lib/ajuda/passos';
import { TEMAS_AJUDA } from '../src/lib/ajuda/temas';
import { prepararTextoParaFala } from '../src/lib/ajuda/voz';

const RAIZ = path.resolve(__dirname, '..');
const PASTA_SAIDA = path.join(RAIZ, 'public', 'audio', 'tutorial');

function obterChave(): string {
  const doEnv = process.env.GOOGLE_GENAI_API_KEY;
  if (doEnv) return doEnv;
  const envPath = path.join(RAIZ, '.env.local');
  const texto = readFileSync(envPath, 'utf8');
  const m = texto.match(/^GOOGLE_GENAI_API_KEY=(.+)$/m);
  if (!m) throw new Error('GOOGLE_GENAI_API_KEY não encontrada em .env.local nem no ambiente.');
  return m[1].trim();
}

function lerArg(nome: string): string | null {
  const arg = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return arg ? arg.slice(nome.length + 3) : null;
}
const FORCAR = process.argv.includes('--force');
const SIMULAR = process.argv.includes('--dry');
const SOMENTE = lerArg('somente');
const VOZ = lerArg('voz') || 'Achird';

interface Job { id: string; texto: string; }

function montarJobs(): Job[] {
  const jobs: Job[] = [];
  PASSOS_BASE.forEach((p, i) => {
    if (p.audioUrl && p.audioUrl === '/introducao.mp3') return; // já tem narração gravada de verdade (ex: introducao.mp3)
    jobs.push({ id: `passo-base-${i}`, texto: p.texto });
  });
  PASSOS_AVANCADOS.forEach((p, i) => {
    jobs.push({ id: `passo-avancado-${i}`, texto: p.texto });
  });
  TEMAS_AJUDA.forEach((t) => {
    jobs.push({ id: `tema-${t.id}-iniciante`, texto: t.iniciante });
    jobs.push({ id: `tema-${t.id}-experiente`, texto: t.experiente });
  });
  return jobs;
}

// import dinâmico: o pacote é ESM puro, e importar por caminho estático via tsx acaba caindo
// na condição "require" do package.json, que aponta pro build IIFE (feito pra <script> de
// navegador) e não exporta a classe certinho fora do navegador.
let Mp3EncoderClasse: new (canais: number, sampleRate: number, kbps: number) => {
  encodeBuffer: (samples: Int16Array) => Uint8Array;
  flush: () => Uint8Array;
};

function pcmParaMp3(pcm: Buffer, sampleRate = 24000): Buffer {
  const amostras = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);
  const encoder = new Mp3EncoderClasse(1, sampleRate, 64);
  const blocos: Buffer[] = [];
  const TAMANHO_BLOCO = 1152;
  for (let i = 0; i < amostras.length; i += TAMANHO_BLOCO) {
    const pedaco = amostras.subarray(i, i + TAMANHO_BLOCO);
    const saida = encoder.encodeBuffer(pedaco);
    if (saida.length > 0) blocos.push(Buffer.from(saida));
  }
  const fim = encoder.flush();
  if (fim.length > 0) blocos.push(Buffer.from(fim));
  return Buffer.concat(blocos);
}

async function gerarAudio(chave: string, texto: string, voz: string, tentativa = 1): Promise<Buffer> {
  // Prefixo explícito evita a API cair em espanhol em frases cognatas ("Enriqueça", "área"...).
  const textoFala = `Leia em português do Brasil, com pronúncia brasileira natural:\n\n${prepararTextoParaFala(texto)}`;
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-goog-api-key': chave },
    body: JSON.stringify({
      contents: [{ parts: [{ text: textoFala }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voz } } },
      },
    }),
  });
  if (r.status === 429 && tentativa <= 3) {
    const espera = tentativa * 3000;
    console.warn(`  limite de taxa, esperando ${espera}ms antes de tentar de novo...`);
    await new Promise((res) => setTimeout(res, espera));
    return gerarAudio(chave, texto, voz, tentativa + 1);
  }
  const j = await r.json();
  const b64 = j?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) throw new Error(j?.error?.message || 'resposta sem áudio');
  return Buffer.from(b64, 'base64');
}

async function main() {
  ({ Mp3Encoder: Mp3EncoderClasse } = await import('@breezystack/lamejs'));

  const jobs = montarJobs().filter((j) => !SOMENTE || j.id === SOMENTE);
  console.log(`${jobs.length} áudio(s) a gerar, voz "${VOZ}"${FORCAR ? ' (forçando regeração)' : ''}${SIMULAR ? ' [SIMULAÇÃO]' : ''}`);

  if (!SIMULAR) mkdirSync(PASTA_SAIDA, { recursive: true });
  const chave = SIMULAR ? '' : obterChave();

  let feitos = 0;
  let pulados = 0;
  for (const job of jobs) {
    const destino = path.join(PASTA_SAIDA, `${job.id}.mp3`);
    if (!FORCAR && existsSync(destino)) {
      pulados++;
      continue;
    }
    if (SIMULAR) {
      console.log(`[simulação] geraria ${job.id}.mp3 (${job.texto.length} caracteres)`);
      continue;
    }
    try {
      const pcm = await gerarAudio(chave, job.texto, VOZ);
      const mp3 = pcmParaMp3(pcm);
      writeFileSync(destino, mp3);
      feitos++;
      console.log(`ok: ${job.id}.mp3 (${(mp3.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      console.error(`FALHOU: ${job.id} — ${(e as Error).message}`);
    }
    // pausa curta entre chamadas pra não estourar a cota por minuto da API
    await new Promise((res) => setTimeout(res, 400));
  }
  console.log(`Concluído: ${feitos} gerado(s), ${pulados} já existiam.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
