import app from "./app";
import { appConfig } from "./config/app-config";
import { ProviderService } from "./services/provider.service";

const startServer = async () => {
  const PORT = appConfig.server.port;

  try {
    // Initialize Blockchain Providers
    console.log("🔗 Initializing Blockchain Providers...");
    const providerService = ProviderService.getInstance();
    const providers = providerService.getAllProviders();

    for (const [chainId, provider] of providers.entries()) {
      try {
        const network = await provider.getNetwork();
        const blockNumber = await provider.getBlockNumber();
        console.log(`   ✅ Connected to Chain ID ${chainId} (${network.name}) - Height: ${blockNumber}`);
      } catch (err) {
        console.error(`   ❌ Failed to connect to Chain ID ${chainId}:`, err);
      }
    }

    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://${appConfig.server.host}:${PORT}`);
      console.log(`   Environment: ${appConfig.env}`);
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
