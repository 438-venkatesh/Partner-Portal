import nodemailer from 'nodemailer';

function publicWebBaseUrl(): string {
  return (
    process.env.PARTNER_PORTAL_PUBLIC_URL?.replace(/\/$/, '') ||
    process.env.FRONTEND_URL?.replace(/\/$/, '') ||
    'http://localhost:5173'
  );
}

function createTransport() {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth:
      user && pass
        ? {
            user,
            pass,
          }
        : undefined,
  });
}

function wrapHtml(title: string, inner: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title></head>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;">
<div style="max-width:560px;margin:0 auto;padding:24px;">
<h1 style="font-size:20px;margin-bottom:16px;">${escapeHtml(title)}</h1>
${inner}
<hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;"/>
<p style="font-size:12px;color:#6b7280;">Partner Portal notification — please do not reply to this email.</p>
</div></body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function send(opts: { to: string; subject: string; html: string; text?: string }) {
  const from = process.env.EMAIL_FROM?.trim();
  const transport = createTransport();

  if (!transport || !from) {
    const msg =
      '[email] SMTP not configured (set SMTP_HOST + EMAIL_FROM). Skipping transactional email.';
    if (process.env.NODE_ENV === 'production') {
      console.error(msg, { to: opts.to });
    } else {
      console.warn(msg, { to: opts.to });
    }
    return { sent: false };
  }

  await transport.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text ?? opts.html.replace(/<[^>]+>/g, ''),
    html: opts.html,
  });
  return { sent: true };
}

export const emailService = {
  isConfigured(): boolean {
    return !!(process.env.SMTP_HOST && process.env.EMAIL_FROM);
  },

  async sendEmailVerification(to: string, token: string, partnerName?: string) {
    const base = publicWebBaseUrl();
    const verifyUrl = `${base}/partner/verify-email?token=${encodeURIComponent(token)}`;
    const html = wrapHtml(
      'Verify your email',
      `<p>${partnerName ? `Welcome to <strong>${escapeHtml(partnerName)}</strong>. ` : ''}Please verify your email address to activate your account.</p>
<p><a href="${verifyUrl}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">Verify email</a></p>
<p style="font-size:13px;">Or paste this link into your browser:<br/><span style="word-break:break-all;">${escapeHtml(verifyUrl)}</span></p>`
    );
    return send({ to, subject: 'Verify your Partner Portal email', html });
  },

  async sendPasswordReset(to: string, token: string) {
    const base = publicWebBaseUrl();
    const resetUrl = `${base}/partner/reset-password/${encodeURIComponent(token)}`;
    const html = wrapHtml(
      'Reset your password',
      `<p>You requested a password reset for your Partner Portal account.</p>
<p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">Reset password</a></p>
<p style="font-size:13px;">This link expires in one hour.</p>`
    );
    return send({ to, subject: 'Reset your Partner Portal password', html });
  },

  async sendEmployeeInvite(
    to: string,
    opts: {
      verificationToken: string;
      tempPassword: string;
      partnerName: string;
      role: string;
    }
  ) {
    const base = publicWebBaseUrl();
    const verifyUrl = `${base}/partner/verify-email?token=${encodeURIComponent(opts.verificationToken)}`;
    const html = wrapHtml(
      `Invitation — ${opts.partnerName}`,
      `<p>You have been invited to join <strong>${escapeHtml(opts.partnerName)}</strong> on the Partner Portal.</p>
<p>Your role: <strong>${escapeHtml(opts.role)}</strong>.</p>
<p>Use this temporary password on first login: <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">${escapeHtml(opts.tempPassword)}</code></p>
<p><a href="${verifyUrl}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">Verify email &amp; get started</a></p>`
    );
    return send({ to, subject: `You're invited to ${opts.partnerName} — Partner Portal`, html });
  },

  async sendPartnerApproved(to: string, partnerName: string) {
    const html = wrapHtml(
      'Partner application approved',
      `<p>Good news — <strong>${escapeHtml(partnerName)}</strong> has been approved.</p>
<p>You can sign in at <a href="${escapeHtml(publicWebBaseUrl() + '/partner/login')}">Partner Portal login</a>.</p>`
    );
    return send({ to, subject: 'Your partner application was approved', html });
  },

  async sendPartnerSuspended(to: string, partnerName: string, reason?: string) {
    const html = wrapHtml(
      'Partner account update',
      `<p>Your organization <strong>${escapeHtml(partnerName)}</strong> has been suspended.</p>
${reason ? `<p>Reason: ${escapeHtml(reason)}</p>` : ''}`
    );
    return send({ to, subject: 'Partner account suspended', html });
  },

  async sendOnboardingStageChange(to: string, partnerName: string, stage: string) {
    const html = wrapHtml(
      'Onboarding update',
      `<p><strong>${escapeHtml(partnerName)}</strong> onboarding moved to stage: <strong>${escapeHtml(stage)}</strong>.</p>`
    );
    return send({ to, subject: `Onboarding update — ${partnerName}`, html });
  },
};
