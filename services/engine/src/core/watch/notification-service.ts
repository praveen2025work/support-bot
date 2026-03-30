import { sendEmail } from "../email/email-service";

interface AlertNotification {
  ruleName: string;
  queryName: string;
  severity: string;
  message: string;
  triggeredValue?: string;
  timestamp: string;
}

interface NotifyOptions {
  channels: string[];
  recipients?: string[];
}

export class NotificationService {
  async notify(
    alert: AlertNotification,
    options: NotifyOptions,
  ): Promise<void> {
    const promises: Promise<void>[] = [];
    if (options.channels.includes("email") && options.recipients?.length) {
      promises.push(this.sendEmailAlert(alert, options.recipients));
    }
    await Promise.allSettled(promises);
  }

  private async sendEmailAlert(
    alert: AlertNotification,
    recipients: string[],
  ): Promise<void> {
    const severityColor =
      alert.severity === "critical"
        ? "#dc2626"
        : alert.severity === "warning"
          ? "#d97706"
          : "#6b7280";
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px;">
        <h2 style="color: ${severityColor};">Watch Alert: ${alert.ruleName}</h2>
        <p><strong>Query:</strong> ${alert.queryName}</p>
        <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
        <p><strong>Details:</strong> ${alert.message}</p>
        ${alert.triggeredValue ? `<p><strong>Value:</strong> ${alert.triggeredValue}</p>` : ""}
        <p style="color: #6b7280; font-size: 12px;">Triggered at ${new Date(alert.timestamp).toLocaleString()}</p>
      </div>`;
    await sendEmail({
      to: recipients,
      subject: `[${alert.severity.toUpperCase()}] Watch Alert: ${alert.ruleName}`,
      htmlBody,
    });
  }
}
