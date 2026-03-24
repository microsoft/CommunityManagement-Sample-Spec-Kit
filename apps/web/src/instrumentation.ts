export async function register(): Promise<void> {
  if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    const azureMonitor = await import("@azure/monitor-opentelemetry");
    azureMonitor.useAzureMonitor();
  }
}
