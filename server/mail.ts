import nodemailer from 'nodemailer';

type FrenchMailKind = 'invitation' | 'payment_received' | 'proof_pending' | 'account_activated' | 'proof_refused';

const subjectByKind: Record<FrenchMailKind, string> = {
  invitation: 'Votre accès Digifeel',
  payment_received: 'Paiement reçu',
  proof_pending: 'Preuve de paiement reçue',
  account_activated: 'Votre espace Digifeel est activé',
  proof_refused: 'Preuve de paiement à compléter'
};

const bodyByKind = (kind: FrenchMailKind, detail: string, link?: string): string => {
  const messages: Record<FrenchMailKind, string> = {
    invitation: `Votre restaurant peut maintenant utiliser Digifeel. Choisissez un mot de passe pour activer votre espace.\n\n${link || ''}`,
    payment_received: `Nous avons bien reçu votre paiement${detail ? ` (${detail})` : ''}. Merci.\n\nVous pouvez accéder à votre espace ici : ${link || ''}`,
    proof_pending: `Votre preuve de paiement${detail ? ` (${detail})` : ''} a été reçue et attend la validation de Digifeel.`,
    account_activated: `Votre espace restaurateur est activé${detail ? ` (${detail})` : ''}. Vous pouvez vous connecter ici : ${link || ''}`,
    proof_refused: `Votre preuve de paiement n’a pas pu être validée${detail ? ` : ${detail}` : ''}. Vous pouvez transmettre une nouvelle preuve depuis votre espace.`
  };
  return messages[kind];
};

export async function sendFrenchMail(
  to: string,
  kind: FrenchMailKind,
  detail = '',
  link?: string
): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;
  if (!host || !from) {
    console.warn(`Email ${kind} non envoyé : SMTP_HOST et SMTP_FROM ne sont pas configurés (destinataire ${to}).`);
    return false;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_PORT must be a valid TCP port.');
  }
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined
  });
  await transporter.sendMail({
    from,
    to,
    subject: subjectByKind[kind],
    text: bodyByKind(kind, detail, link)
  });
  return true;
}
