import nodemailer from "nodemailer";

type ReporteEmailInput = {
  to: string;
  residentName: string;
  days: number;
  html: string;
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta configurar ${name} para enviar correos.`);
  }
  return value;
}

export async function enviarReportePorEmail(input: ReporteEmailInput) {
  const host = requiredEnv("SMTP_HOST");
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  const user = requiredEnv("SMTP_USER");
  const pass = requiredEnv("SMTP_PASS");
  const from = process.env.SMTP_FROM || user;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });

  const info = await transporter.sendMail({
    from,
    to: input.to,
    subject: `Reporte Hogar Antu - ${input.residentName} - ultimos ${input.days} dias`,
    html: input.html
  });

  return {
    ok: true,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected
  };
}
