import nodemailer from 'nodemailer';

export interface OutgoingMail {
  to: string;
  fromName: string;
  replyTo?: string;
  subject: string;
  text: string;
  /** Stable per guest and email; the provider uses it to drop repeats after a retry (L2-035 AC1). */
  idempotencyKey: string;
}

export interface MailTransport {
  send(mail: OutgoingMail): Promise<void>;
}

/** Keeps messages in memory and, like a real provider, ignores a repeated idempotency key. Used by tests and the e2e server. */
export class MemoryTransport implements MailTransport {
  readonly sent: OutgoingMail[] = [];
  private readonly keys = new Set<string>();
  /** Set to make the next sends throw, to exercise retries. */
  failNext = 0;

  async send(mail: OutgoingMail) {
    if (this.failNext > 0) {
      this.failNext--;
      throw new Error('Temporary provider error');
    }
    if (this.keys.has(mail.idempotencyKey)) return;
    this.keys.add(mail.idempotencyKey);
    this.sent.push(mail);
  }
}

/** Development default: prints each message instead of sending it. */
export class LogTransport implements MailTransport {
  async send(mail: OutgoingMail) {
    console.log(`[mail] to=${mail.to} subject=${JSON.stringify(mail.subject)} key=${mail.idempotencyKey}`);
  }
}

/** Header values must never carry line breaks (L2-036 AC3); quoting keeps commas in names harmless. */
const quoteName = (name: string) => `"${name.replace(/[\r\n]+/g, ' ').replace(/["\\]/g, '\\$&')}"`;

export class SmtpTransport implements MailTransport {
  private readonly transporter;

  constructor(url: string, private readonly fromAddress: string) {
    this.transporter = nodemailer.createTransport(url);
  }

  async send(mail: OutgoingMail) {
    await this.transporter.sendMail({
      from: `${quoteName(mail.fromName)} <${this.fromAddress}>`,
      to: mail.to,
      replyTo: mail.replyTo || undefined,
      subject: mail.subject,
      text: mail.text,
      messageId: `<${mail.idempotencyKey}@${this.fromAddress.split('@')[1] ?? 'localhost'}>`,
      headers: { 'Idempotency-Key': mail.idempotencyKey },
    });
  }
}
