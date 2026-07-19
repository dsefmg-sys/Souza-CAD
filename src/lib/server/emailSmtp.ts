import { getFirestore } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
import { getAdminApp } from '@/lib/firebaseAdmin';

export interface ConfigSmtp { host?: string; port?: string; user?: string; pass?: string; from?: string }
export interface ResultadoEnvioEmail { enviado: boolean; erro?: string }

// Preferência: credenciais coladas pelo dono no painel administrativo (config/emailSmtp — só o
// master lê/escreve esse documento, ver firestore.rules). Se algum campo não estiver definido no Firestore,
// cai nas variáveis de ambiente (uso local/alternativo). Compartilhada entre todas as rotas que mandam
// e-mail (comunicados do gestor, convite de colaborador) pra não duplicar a mesma lógica.
export async function obterConfigSmtp(): Promise<ConfigSmtp> {
  let fsCfg: ConfigSmtp = {};
  try {
    const snap = await getFirestore(getAdminApp()).collection('config').doc('emailSmtp').get();
    if (snap.exists) {
      fsCfg = (snap.data() as ConfigSmtp) || {};
    }
  } catch { /* ignore — cai pro env abaixo */ }

  const host = (fsCfg.host || process.env.SMTP_HOST || '').trim();
  const port = (fsCfg.port || process.env.SMTP_PORT || '465').trim();
  const user = (fsCfg.user || process.env.SMTP_USER || '').trim();
  const pass = (fsCfg.pass || process.env.SMTP_PASS || '').trim();
  const from = (fsCfg.from || process.env.SMTP_FROM || '').trim();

  return { host, port, user, pass, from };
}

/** Manda um e-mail com a config do SMTP acima. Devolve `enviado:false` com mensagem de erro quando o
 *  SMTP não está configurado ou falha — quem chama decide se isso é aceitável (ex.: convite ainda funciona
 *  sem e-mail, só não avisa por essa via) ou deve virar aviso pro usuário. */
export async function enviarEmailSmtp(opts: { to: string; subject: string; html: string }): Promise<ResultadoEnvioEmail> {
  const cfg = await obterConfigSmtp();
  const smtpHost = cfg.host;
  const smtpPort = cfg.port || '465';
  const smtpUser = cfg.user;
  const smtpPass = cfg.pass;
  const smtpFrom = cfg.from || (smtpUser ? `Souza CAD <${smtpUser}>` : 'Souza CAD <no-reply@souzacad.com>');

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    const msg = 'Servidor de e-mail (SMTP) não configurado (host, usuário ou senha ausentes).';
    console.warn('[emailSmtp]', msg);
    return { enviado: false, erro: msg };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465,
      auth: { user: smtpUser, pass: smtpPass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    await transporter.sendMail({ from: smtpFrom, to: opts.to, subject: opts.subject, html: opts.html });
    return { enviado: true };
  } catch (err: unknown) {
    const msg = (err as Error)?.message || String(err);
    console.error('[emailSmtp] Erro ao enviar e-mail via SMTP:', msg);
    return { enviado: false, erro: msg };
  }
}

