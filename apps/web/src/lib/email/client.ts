// Email client — Spec 015
//
// Sends emails via Azure Communication Services using Managed Identity.
// Constitution XIV: DefaultAzureCredential for all Azure services.

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email via Azure Communication Services.
 * Uses DefaultAzureCredential for Managed Identity authentication.
 *
 * In dev/test environments without Azure configuration, this is a no-op.
 */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const connectionEndpoint = process.env.AZURE_COMMUNICATION_ENDPOINT;

  if (!connectionEndpoint) {
    // Dev/test environment — no Azure Communication Services available
    console.log(`[email] Skipping email send (no AZURE_COMMUNICATION_ENDPOINT): ${message.subject}`);
    return false;
  }

  try {
    // Dynamic imports — these packages are only available in production Azure environments
    // @ts-expect-error -- @azure/communication-email is an optional production dependency
    const { EmailClient } = await import("@azure/communication-email");
    const { DefaultAzureCredential } = await import("@azure/identity");

    const credential = new DefaultAzureCredential({
      managedIdentityClientId: process.env.AZURE_CLIENT_ID,
    });

    const client = new EmailClient(connectionEndpoint, credential);

    const senderAddress = process.env.EMAIL_SENDER_ADDRESS ?? "noreply@acroyoga.community";

    await client.beginSend({
      senderAddress,
      recipients: {
        to: [{ address: message.to }],
      },
      content: {
        subject: message.subject,
        html: message.html,
      },
    });

    return true;
  } catch (err) {
    console.error("[email] Failed to send email:", err);
    return false;
  }
}
