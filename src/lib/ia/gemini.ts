'use client';

// IA pelo Firebase AI Logic: o Gemini roda no NAVEGADOR usando o app Firebase (souza-cad), sem
// chave de API no código — a proteção contra abuso vem do Firebase App Check (a configurar no
// console). É o caminho recomendado pelo Google. Se este caminho falhar (App Check/AI Logic ainda
// não habilitados no console), o modal cai na rota de servidor /api/ia como reserva.
import { getAI, getGenerativeModel, GoogleAIBackend, type GenerativeModel } from 'firebase/ai';
import { firebaseApp, firebaseConfigurado } from '../firebase/client';

const MODELO = 'gemini-1.5-flash';

export const IA_FIREBASE_DISPONIVEL = firebaseConfigurado;

let _model: GenerativeModel | null = null;
function modelo(): GenerativeModel | null {
  const app = firebaseApp();
  if (!app) return null;
  if (!_model) {
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    _model = getGenerativeModel(ai, {
      model: MODELO,
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    });
  }
  return _model;
}

function promptExtrairImovel(texto: string): string {
  return (
    'Você é um assistente de agrimensura no Brasil. Extraia do texto abaixo os dados do IMÓVEL e ' +
    'do PROPRIETÁRIO para um georreferenciamento (SIGEF/INCRA). Responda APENAS com um JSON válido, ' +
    'sem markdown e sem comentários, com EXATAMENTE estas chaves (use string vazia quando não achar): ' +
    'denominacao, matricula, cns, codigoImovelIncra, proprietario, cpfProprietario, conjugeProprietario, ' +
    'cpfConjugeProprietario, municipio, areaAnteriorHa. Não invente dados que não estejam no texto.\n\n' +
    'TEXTO:\n"""' + texto.slice(0, 12000) + '"""'
  );
}

function extrairJson(saida: string): Record<string, string> {
  try { return JSON.parse(saida); }
  catch {
    const m = saida.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch { /* nada */ } }
  }
  return {};
}

/** Extrai os campos do imóvel de um texto, pela IA no navegador (Firebase AI Logic). */
export async function extrairImovelFirebaseIA(texto: string): Promise<Record<string, string>> {
  const m = modelo();
  if (!m) throw new Error('Firebase AI indisponível (app não configurado).');
  const r = await m.generateContent(promptExtrairImovel(texto));
  return extrairJson(r.response.text());
}
