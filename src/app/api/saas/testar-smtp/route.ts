import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/apiAuth';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await verifySession(req);
  if (!session || !session.admin) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  }

  try {
    const { host, port, user, pass, from, destinatario } = await req.json();

    if (!host || !user || !pass) {
      return NextResponse.json({
        success: false,
        error: 'Preencha todos os campos obrigatórios: Servidor (Host), E-mail remetente e Senha de App.'
      }, { status: 400 });
    }

    const smtpPort = Number(port || 465);
    const smtpFrom = from || `Souza CAD <${user}>`;
    const emailDestino = destinatario || user;

    const transporter = nodemailer.createTransport({
      host: host.trim(),
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: user.trim(),
        pass: pass.trim(),
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    // 1. Testa autenticação e conexão com o servidor de e-mail
    await transporter.verify();

    // 2. Envia e-mail de teste real
    await transporter.sendMail({
      from: smtpFrom,
      to: emailDestino,
      subject: 'Teste de Configuração de E-mail - Souza CAD',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f8; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="background: #16a34a; padding: 20px; color: #ffffff; text-align: center;">
              <h2 style="margin: 0;">Souza CAD - Teste de Disparo de E-mail</h2>
            </div>
            <div style="padding: 24px;">
              <p style="font-size: 16px; color: #15803d; font-weight: bold;">Parabéns! O seu servidor de e-mail foi configurado com sucesso.</p>
              <p style="font-size: 14px; color: #475569;">Esta mensagem confirma que as credenciais do seu disparador de comunicados estão funcionando perfeitamente no Souza CAD.</p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="font-size: 12px; color: #64748b; margin: 0;">Configurações Testadas:<br />
              <strong>Host:</strong> ${host}<br />
              <strong>Porta:</strong> ${smtpPort}<br />
              <strong>Remetente:</strong> ${user}</p>
            </div>
          </div>
        </div>
      `
    });

    return NextResponse.json({
      success: true,
      mensagem: `E-mail de teste enviado com sucesso para ${emailDestino}!`
    });
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error('[testar-smtp] Erro de teste:', errorMsg);

    let orientacao = 'Verifique se as credenciais e o servidor estão corretos.';

    if (errorMsg.includes('535') || errorMsg.toLowerCase().includes('authentication failed') || errorMsg.toLowerCase().includes('invalid login')) {
      orientacao = 'SENHA INCORRETA OU BLOQUEADA: Se o seu e-mail é Gmail ou Outlook, NÃO utilize a sua senha normal do e-mail. Você precisa gerar uma "Senha de App" nas configurações de segurança da sua conta Google ou Microsoft.';
    } else if (errorMsg.includes('ETIMEDOUT') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ENOTFOUND')) {
      orientacao = 'FALHA DE CONEXÃO: O servidor ou a porta não responderam. Para Gmail use smtp.gmail.com na porta 465 (SSL). Para Outlook use smtp-mail.outlook.com na porta 587 (TLS).';
    }

    return NextResponse.json({
      success: false,
      error: `Erro ao enviar e-mail de teste: ${errorMsg}`,
      orientacao
    }, { status: 400 });
  }
}
