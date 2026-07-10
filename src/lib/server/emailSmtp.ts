import { getFirestore } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
import { getAdminApp } from '@/lib/firebaseAdmin';

export interface ConfigSmtp { host?: string; port?: string; user?: string; pass?: string; from?: string }

// Preferência: credenciais coladas pelo dono no painel administrativo (config/emailSmtp — só o
// master lê/escreve esse documento, ver firestore.rules). Isso existe pra ele não depender de ir
// na Vercel toda vez que troca a senha do app do Gmail. Se não houver nada salvo ali, cai nas
// variáveis de ambiente (uso local/alternativo). Compartilhada entre todas as rotas que mandam
// e-mail (comunicados do gestor, convite de colaborador) pra não duplicar a mesma lógica.
export async function obterConfigSmtp(): Promise<ConfigSmtp> {
  try {
    const snap = await getFirestore(getAdminApp()).collection('config').doc('emailSmtp').get();
    const d = snap.exists ? (snap.data() as ConfigSmtp) : {};
    if (d?.host && d?.user && d?.pass) return d;
  } catch { /* ignore — cai pro env abaixo */ }
  return {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
  };
}

/** Manda um e-mail com a config do SMTP acima. Devolve `enviado:false` (sem lançar erro) quando o
 *  SMTP não está configurado — quem chama decide se isso é aceitável (ex.: convite ainda funciona
 *  sem e-mail, só não avisa por essa via) ou deve virar erro pro usuário. */
export async function enviarEmailSmtp(opts: { to: string; subject: string; html: string }): Promise<{ enviado: boolean }> {
  const cfg = await obterConfigSmtp();
  const smtpHost = cfg.host;
  const smtpPort = cfg.port || '465';
  const smtpUser = cfg.user;
  const smtpPass = cfg.pass;
  const smtpFrom = cfg.from || (smtpUser ? `Souza CAD <${smtpUser}>` : 'Souza CAD <no-reply@souzacad.com>');

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    return { enviado: false };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(smtpPort),
    secure: Number(smtpPort) === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });
  await transporter.sendMail({ from: smtpFrom, to: opts.to, subject: opts.subject, html: opts.html });
  return { enviado: true };
}
