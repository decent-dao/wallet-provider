import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import Web3Modal from 'web3modal';
import type { ConnectFn, DisconnectFn, DWPConfig, InitialState, ModalTheme } from './types';
import { ActionTypes, Web3ProviderActions } from './actions';
import { getWeb3modalOptions } from './helpers/web3ModalConfig';
import { getLocalProvider, getFallbackProvider, getInjectedProvider } from './helpers';
import { useProviderListeners } from './hooks/useProviderListeners';
import { Web3ProviderContext } from './hooks/useWeb3Provider';

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
      return { ...initialState };
    }
    default:
      return state;
  }
};

export function Web3Provider({
  config,
  theme,
  children,
}: {
  config: DWPConfig;
  theme?: string | ModalTheme;
  children: any;
}) {
  const [state, dispatch] = useReducer(reducer, getInitialState());
  const web3Modal = useMemo(() => new Web3Modal(getWeb3modalOptions(theme)), [theme]);
  const didMountRef = useRef(false);

  const connectDefaultProvider = useCallback(async () => {
    web3Modal.clearCachedProvider();
    const isLocalDevelopment =
      process.env.NODE_ENV === 'development' && !!config.localChainId && !!config.localProviderURL;
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
  }, [config, web3Modal]);

  const connect: ConnectFn = useCallback(async () => {
    const userInjectedProvider = await getInjectedProvider(web3Modal, config);
    if (config.supportedChains.includes(userInjectedProvider.chainId)) {
      dispatch({
        type: Web3ProviderActions.SET_INJECTED_PROVIDER,
        payload: userInjectedProvider,
      });
    } else {
      connectDefaultProvider();
    }
  }, [connectDefaultProvider, config, web3Modal]);

  const disconnect: DisconnectFn = useCallback(() => {
    // @todo add 'account disconnected' event
    // switch to a default provider
    connectDefaultProvider();
  }, [connectDefaultProvider]);

  useProviderListeners(web3Modal, connectDefaultProvider, connect, config);

  const load = useCallback(async () => {
    if (didMountRef.current) {
      if (web3Modal.cachedProvider) {
        await connect();
      } else {
        connectDefaultProvider();
      }
    }
    didMountRef.current = true;
  }, [connect, connectDefaultProvider, web3Modal]);

  useEffect(() => {
    load();
  }, [load]);

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
