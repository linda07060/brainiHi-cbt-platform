import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') || 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const secure = port === 465;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
    } else {
      // Warn if SMTP not configured; mailer will throw on use
      // eslint-disable-next-line no-console
      console.warn('MailService: SMTP not fully configured. Email sending disabled.');
    }
  }

  async sendMail(to: string, subject: string, html: string) {
    if (!this.transporter) {
      throw new InternalServerErrorException('Mailer not configured (SMTP settings missing)');
    }

    const from = this.configService.get<string>('MAIL_FROM') || `no-reply@${this.configService.get<string>('MAIL_DOMAIN') || 'example.com'}`;

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('MailService.sendMail error', err);
      throw err;
    }
  }
}