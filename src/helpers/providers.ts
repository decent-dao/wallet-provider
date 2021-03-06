import { FallbackProviders, DWPConfig, WalletProvider, ProviderApiKeys } from './../types/index';
import { ethers, getDefaultProvider } from 'ethers';

export const getProviderInfo = async (
  _provider: any,
  config: DWPConfig
): Promise<[WalletProvider, ethers.providers.Web3Provider]> => {
  const provider = new ethers.providers.Web3Provider(_provider);
  const network = await provider.getNetwork();
  const signer = provider.getSigner();
  const local = config.localChainId && network.chainId === parseInt(config.localChainId, 10);
  const account = (await signer.getAddress()) || null;
  return [
    {
      account: account,
      signerOrProvider: signer,
      provider: provider,
      connectionType: !account ? 'fallback' : 'injected provider',
      network: local ? 'localhost' : network.name,
      chainId: network.chainId,
    },
    provider,
  ];
};

export const getLocalProvider = (
  config: DWPConfig
): Promise<[WalletProvider, FallbackProviders]> => {
  const localProvider = new ethers.providers.JsonRpcProvider(config.localProviderURL);
  return new Promise<[WalletProvider, FallbackProviders]>((resolve, reject) => {
    localProvider
      .detectNetwork()
      .then(network => {
        resolve([
          {
            account: null,
            provider: localProvider,
            signerOrProvider: localProvider,
            connectionType: 'local provider',
            network: 'localhost',
            chainId: network.chainId,
          },
          localProvider,
        ]);
      })
      .catch(reject);
  });
};

export const getFallbackProvider = (config: DWPConfig): [WalletProvider, FallbackProviders] => {
  const providerApiKeys: ProviderApiKeys = {};
  if (config.providerKeys.infura) providerApiKeys.infura = config.providerKeys.infura;
  if (config.providerKeys.alchemy) providerApiKeys.alchemy = config.providerKeys.alchemy;
  if (config.providerKeys.etherscan) providerApiKeys.etherscan = config.providerKeys.etherscan;

  const network = ethers.providers.getNetwork(parseInt(config.fallbackChainId || '0', 10));
  const defaultProvider = getDefaultProvider(network, providerApiKeys);

  return [
    {
      account: null,
      provider: defaultProvider,
      signerOrProvider: defaultProvider,
      connectionType: 'readonly provider',
      network: defaultProvider.network.name,
      chainId: defaultProvider.network.chainId,
    },
    defaultProvider,
  ];
};
