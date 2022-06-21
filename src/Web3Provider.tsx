import React, { useCallback, useEffect, useMemo, useReducer } from 'react';
import Web3Modal from 'web3modal';
import type { ConnectFn, DisconnectFn, DWPConfig, InitialState } from './types';
import { ActionTypes, Web3ProviderActions } from './actions';
import { WEB3_MODAL_CONFIG } from './web3Modal.config';
import { getLocalProvider, getFallbackProvider, getInjectedProvider } from './utils/helpers';
import { toast } from 'react-toastify';
import { useProviderListeners } from './hooks/useProviderListeners';
import { supportedChains } from './chains';
import { Web3ProviderContext } from './hooks/useWeb3Provider';

const web3Modal = new Web3Modal(WEB3_MODAL_CONFIG);
const initialState: InitialState = {
  account: null,
  signerOrProvider: null,
  connectionType: 'not connected',
  network: '',
  chainId: 0,
  provider: null,
  isProviderLoading: false,
};

const getInitialState = () => {
  return {
    ...initialState,
    isProviderLoading: true,
  };
};

const reducer = (state: InitialState, action: ActionTypes) => {
  switch (action.type) {
    case Web3ProviderActions.SET_INJECTED_PROVIDER: {
      const { account, signerOrProvider, provider, connectionType, network, chainId } =
        action.payload;
      return {
        ...state,
        account,
        signerOrProvider,
        provider,
        connectionType,
        network,
        chainId,
        isProviderLoading: false,
      };
    }
    case Web3ProviderActions.SET_LOCAL_PROVIDER:
    case Web3ProviderActions.SET_FALLBACK_PROVIDER: {
      const { provider, connectionType, network, chainId, signerOrProvider } = action.payload;
      return {
        ...initialState,
        provider,
        connectionType,
        network,
        chainId,
        signerOrProvider,
        isProviderLoading: false,
      };
    }
    case Web3ProviderActions.DISCONNECT_WALLET: {
      web3Modal.clearCachedProvider();
      return { ...initialState };
    }
    default:
      return state;
  }
};

export function Web3Provider({ config, children }: { config: DWPConfig, children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, getInitialState());

  const connectDefaultProvider = useCallback(async () => {
    web3Modal.clearCachedProvider();
    const isLocalDevelopment = config.local && config.isDev && config.local.localChainId && config.local.providerURL
    if (isLocalDevelopment) {
      dispatch({
        type: Web3ProviderActions.SET_LOCAL_PROVIDER,
        payload: await getLocalProvider(config),
      });
    } else {
      dispatch({
        type: Web3ProviderActions.SET_FALLBACK_PROVIDER,
        payload: getFallbackProvider(config),
      });
    }
  }, []);

  const connect: ConnectFn = useCallback(async () => {
    const userInjectedProvider = await getInjectedProvider(web3Modal, config);
    if (supportedChains(config).includes(userInjectedProvider.chainId)) {
      dispatch({
        type: Web3ProviderActions.SET_INJECTED_PROVIDER,
        payload: userInjectedProvider,
      });
    } else {
      connectDefaultProvider();
    }
  }, [connectDefaultProvider]);

  const disconnect: DisconnectFn = useCallback(() => {
    toast('Account disconnected', { toastId: 'disconnected' });
    // switch to a default provider
    connectDefaultProvider();
  }, [connectDefaultProvider]);

  useProviderListeners(web3Modal, connectDefaultProvider, connect, config);

  const load = useCallback(() => {
    if (web3Modal.cachedProvider) {
      connect();
      return;
    }
    connectDefaultProvider();
  }, [connect, connectDefaultProvider]);

  useEffect(() => load(), [load]);

  const contextValue = useMemo(
    () => ({
      state,
      connect,
      disconnect,
    }),
    [state, connect, disconnect]
  );
  return (
    <Web3ProviderContext.Provider value={contextValue}>{children}</Web3ProviderContext.Provider>
  );
}
