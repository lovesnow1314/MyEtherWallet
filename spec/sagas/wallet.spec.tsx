import { configuredStore } from 'store';
import RpcNode from 'libs/nodes/rpc';
import {
  broadcastTxSucceded,
  setBalanceFullfilled,
  setBalancePending,
  unlockPrivateKey as unlockPrivateKeyActionGen,
  unlockKeystore as unlockKeystoreActionGen,
  unlockMnemonic as unlockMnemonicActionGen,
  broadcastTx as broadcastTxActionGen
} from 'actions/wallet';
import { Wei } from 'libs/units';
import { changeNodeIntent, web3UnsetNode } from 'actions/config';
import { INode } from 'libs/nodes/INode';
import { initWeb3Node, Token, N_FACTOR } from 'config/data';
import { apply, call, fork, put, select, take } from 'redux-saga/effects';
import { getNetworkConfig, getNodeLib } from 'selectors/config';
import { getTokens, getWalletInst } from 'selectors/wallet';
import {
  updateAccountBalance,
  updateTokenBalances,
  updateBalances,
  unlockPrivateKey,
  unlockKeystore,
  unlockMnemonic,
  unlockWeb3,
  broadcastTx
} from 'sagas/wallet';
import { PrivKeyWallet } from 'libs/wallet/non-deterministic';
import { TypeKeys as ConfigTypeKeys } from 'actions/config/constants';
import Web3Node from 'libs/nodes/web3';
import { cloneableGenerator } from 'redux-saga/utils';
import { showNotification } from 'actions/notifications';
import translate from 'translations';

// init module
configuredStore.getState();

const pkey = '31e97f395cabc6faa37d8a9d6bb185187c35704e7b976c7a110e2f0eab37c344';
const wallet = PrivKeyWallet(Buffer.from(pkey, 'hex'));
const address = '0xe2EdC95134bbD88443bc6D55b809F7d0C2f0C854';
const balance = Wei('100');
const node: INode = new RpcNode('');

const token1: Token = {
  address: '0x2',
  symbol: 'OMG',
  decimal: 16
};
const token2: Token = {
  address: '0x3',
  symbol: 'BAT',
  decimal: 16
};
const tokens = [token1, token2];
const balances = [Wei('100'), Wei('200')];

const utcKeystore = {
  version: 3,
  id: 'cb788af4-993d-43ad-851b-0d2031e52c61',
  address: '25a24679f35e447f778cf54a3823facf39904a63',
  Crypto: {
    ciphertext:
      '4193915c560835d00b2b9ff5dd20f3e13793b2a3ca8a97df649286063f27f707',
    cipherparams: {
      iv: 'dccb8c009b11d1c6226ba19b557dce4c'
    },
    cipher: 'aes-128-ctr',
    kdf: 'scrypt',
    kdfparams: {
      dklen: 32,
      salt: '037a53e520f2d00fb70f02f39b31b77374de9e0e1d35fd7cbe9c8a8b21d6b0ab',
      n: N_FACTOR,
      r: 8,
      p: 1
    },
    mac: '774fbe4bf35e7e28df15cd6c3546e74ce6608e9ab68a88d50227858a3b05769a'
  }
};

// necessary so we can later inject a mocked web3 to the window

describe('updateAccountBalance*', () => {
  const gen1 = updateAccountBalance();
  const gen2 = updateAccountBalance();

  it('should put setBalancePending', () => {
    expect(gen1.next().value).toEqual(put(setBalancePending()));
  });

  it('should select getWalletInst', () => {
    expect(gen1.next().value).toEqual(select(getWalletInst));
  });

  it('should return if wallet is falsey', () => {
    gen2.next();
    gen2.next();
    gen2.next(null);
    expect(gen2.next().done).toBe(true);
  });

  it('should select getNodeLib', () => {
    expect(gen1.next(wallet).value).toEqual(select(getNodeLib));
  });

  it('should apply wallet.getAddressString', () => {
    expect(gen1.next(node).value).toEqual(
      apply(wallet, wallet.getAddressString)
    );
  });

  it('should apply node.getBalance', () => {
    expect(gen1.next(address).value).toEqual(
      apply(node, node.getBalance, [address])
    );
  });

  it('should put setBalanceFulfilled', () => {
    expect(gen1.next(balance).value).toEqual(
      put(setBalanceFullfilled(balance))
    );
  });

  it('should be done', () => {
    expect(gen1.next().done).toEqual(true);
  });
});

describe('updateTokenBalances*', () => {
  const gen1 = updateTokenBalances();
  const gen2 = updateTokenBalances();
  const gen3 = updateTokenBalances();

  it('should select getNodeLib', () => {
    expect(gen1.next().value).toEqual(select(getNodeLib));
  });

  it('should select getWalletInst', () => {
    expect(gen1.next(node).value).toEqual(select(getWalletInst));
  });

  it('should select getTokens', () => {
    expect(gen1.next(wallet).value).toEqual(select(getTokens));
  });

  it('should return if wallet is falsey', () => {
    gen2.next();
    gen2.next(node);
    gen2.next(null);
    expect(gen2.next().done).toEqual(true);
  });

  it('should return if node is falsey', () => {
    gen3.next();
    gen3.next(null);
    gen3.next(wallet);
    expect(gen3.next().done).toEqual(true);
  });

  it('should apply wallet.getAddressString', () => {
    expect(gen1.next(tokens).value).toEqual(
      apply(wallet, wallet.getAddressString)
    );
  });

  it('should apply node.getTokenBalances', () => {
    expect(gen1.next(address).value).toEqual(
      apply(node, node.getTokenBalances, [address, tokens])
    );
  });

  it('should match put setTokenBalances snapshot', () => {
    expect(gen1.next(balances).value).toMatchSnapshot();
  });

  it('should be done', () => {
    expect(gen1.next().done).toEqual(true);
  });
});

describe('updateBalances*', () => {
  const gen = updateBalances();

  it('should fork updateAccountBalance', () => {
    expect(gen.next().value).toEqual(fork(updateAccountBalance));
  });

  it('should fork updateTokenBalances', () => {
    expect(gen.next().value).toEqual(fork(updateTokenBalances));
  });

  it('should be done', () => {
    expect(gen.next().done).toEqual(true);
  });
});

describe('unlockPrivateKey', () => {
  const value = {
    key: pkey,
    password: ''
  };
  const action = unlockPrivateKeyActionGen(value);
  const gen = unlockPrivateKey(action);

  it('should match put setWallet snapshot', () => {
    expect(gen.next().value).toMatchSnapshot();
  });

  it('should be done', () => {
    expect(gen.next().done).toEqual(true);
  });
});

describe('unlockKeystore*', () => {
  const action = unlockKeystoreActionGen({
    file: JSON.stringify(utcKeystore),
    password: 'testtesttest'
  });
  const gen = unlockKeystore(action);

  it('should match put setWallet snapshot', () => {
    expect(gen.next().value).toMatchSnapshot();
  });

  it('should be done', () => {
    expect(gen.next().done).toEqual(true);
  });
});

describe('unlockMnemonic*', () => {
  const action = unlockMnemonicActionGen({
    phrase:
      'first catalog away faculty jelly now life kingdom pigeon raise gain accident',
    pass: '',
    path: "m/44'/60'/0'/0/8",
    address: '0xe2EdC95134bbD88443bc6D55b809F7d0C2f0C854'
  });
  const gen = unlockMnemonic(action);

  it('should match put setWallet snapshot', () => {
    expect(gen.next().value).toMatchSnapshot();
  });

  it('should be done', () => {
    expect(gen.next().done).toEqual(true);
  });
});

describe('unlockWeb3*', () => {
  const G = global as any;
  const data = {} as any;
  data.gen = cloneableGenerator(unlockWeb3)();
  const accounts = [address];
  const { random } = Math;
  let nodeLib;

  function sendAsync(options, cb) {
    const resp = {
      id: 'id'
    };
    switch (options.method) {
      case 'net_version':
        return cb(null, { ...resp, result: '1' });
      case 'eth_accounts':
        return cb(null, { ...resp, result: JSON.stringify(accounts) });
    }
  }

  beforeAll(async done => {
    G.web3 = {
      currentProvider: {
        sendAsync
      }
    };
    nodeLib = new Web3Node();
    Math.random = () => 0.001;
    await initWeb3Node();
    done();
  });

  afterAll(() => {
    Math.random = random;
    delete G.web3;
  });

  it('should call initWeb3Node', () => {
    expect(data.gen.next().value).toEqual(call(initWeb3Node));
  });

  it('should put changeNodeIntent', () => {
    expect(data.gen.next(accounts).value).toEqual(
      put(changeNodeIntent('web3'))
    );
  });

  it('should yield take on node change', () => {
    const expected = take(
      action =>
        action.type === ConfigTypeKeys.CONFIG_NODE_CHANGE &&
        action.payload.nodeSelection === 'web3'
    );
    const result = data.gen.next().value;
    expect(JSON.stringify(expected)).toEqual(JSON.stringify(result));
  });

  it('should select getNodeLib', () => {
    expect(data.gen.next().value).toEqual(select(getNodeLib));
  });

  it('should throw & catch if node is not web3 node', () => {
    data.clone = data.gen.clone();
    expect(data.clone.next().value).toEqual(put(web3UnsetNode()));
    expect(data.clone.next().value).toEqual(
      put(
        showNotification(
          'danger',
          translate('Cannot use Web3 wallet without a Web3 node.')
        )
      )
    );
    expect(data.clone.next().done).toEqual(true);
  });

  it('should apply nodeLib.getAccounts', () => {
    expect(data.gen.next(nodeLib).value).toEqual(
      apply(nodeLib, nodeLib.getAccounts)
    );
  });

  it('should throw & catch if no accounts found', () => {
    data.clone1 = data.gen.clone();
    expect(data.clone1.next([]).value).toEqual(put(web3UnsetNode()));
    expect(data.clone1.next().value).toEqual(
      put(
        showNotification(
          'danger',
          translate('No accounts found in MetaMask / Mist.')
        )
      )
    );
    expect(data.clone1.next().done).toEqual(true);
  });

  it('should match setWallet snapshot', () => {
    expect(data.gen.next(accounts).value).toMatchSnapshot();
  });
});

describe('broadcastTx*', () => {
  const signedTx = 'signedTx';
  const txHash = 'txHash';
  const action = broadcastTxActionGen(signedTx);
  const gen = broadcastTx(action);
  const networkConfig = {
    blockExplorer: 'foo'
  };
  let random;

  beforeAll(() => {
    random = Math.random;
    Math.random = jest.fn(() => 0.001);
  });

  afterAll(() => {
    Math.random = random;
  });

  it('should select getNodeLib', () => {
    expect(gen.next().value).toEqual(select(getNodeLib));
  });

  it('should select getNetworkConfig', () => {
    expect(gen.next(node).value).toEqual(select(getNetworkConfig));
  });

  it('should apply node.sendRawTx', () => {
    expect(gen.next(networkConfig).value).toEqual(
      apply(node, node.sendRawTx, [signedTx])
    );
  });

  it('should match put showNotifiction snapshot', () => {
    expect(gen.next(txHash).value).toMatchSnapshot();
  });

  it('should put broadcastTxSucceded', () => {
    expect(gen.next().value).toEqual(
      put(broadcastTxSucceded(txHash, signedTx))
    );
  });
});
