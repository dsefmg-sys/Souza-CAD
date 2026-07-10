import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/apiAuth';
import nodemailer from 'nodemailer';
import { obterConfigSmtp } from '@/lib/server/emailSmtp';

export async function POST(req: Request) {
  const session = await verifySession(req);
  if (!session || !session.admin) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  }

  try {
    const { emails, assunto, mensagemHtml } = await req.json();
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'Nenhum e-mail especificado.' }, { status: 400 });
    }

    const cfg = await obterConfigSmtp();
    const smtpHost = cfg.host;
    const smtpPort = cfg.port || '465';
    const smtpUser = cfg.user;
    const smtpPass = cfg.pass;
    const smtpFrom = cfg.from || (smtpUser ? `Souza CAD <${smtpUser}>` : 'Souza CAD <no-reply@souzacad.com>');

    let enviadoCount = 0;
    let configurado = false;

    if (smtpHost && smtpPort && smtpUser && smtpPass) {
      configurado = true;
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: Number(smtpPort) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      for (const dest of emails) {
        await transporter.sendMail({
          from: smtpFrom,
          to: dest,
          subject: assunto,
          html: mensagemHtml,
        });
        enviadoCount++;
      }
    } else {
      console.log('=== ENVIANDO E-MAILS (SIMULAÇÃO) ===');
      console.log('Assunto:', assunto);
      console.log('Destinatários:', emails.join(', '));
      console.log('Mensagem HTML (resumo):', mensagemHtml.slice(0, 500) + '...');
      console.log('====================================');
      enviadoCount = emails.length;
    }

    return NextResponse.json({
      success: true,
      enviados: enviadoCount,
      simulado: !configurado,
      mensagem: configurado
        ? `Sucesso: ${enviadoCount} e-mails enviados via SMTP.`
        : `Simulação: ${enviadoCount} e-mails registrados no log do servidor (SMTP não configurado).`
    });
  } catch (err: unknown) {
    console.error('Erro no envio de e-mails:', err);
    return NextResponse.json({ error: (err as Error).message || 'Erro interno.' }, { status: 500 });
  }
}
