/**
 * Duble dos modulos nativos para os testes rodarem no Node, sem celular.
 *
 * AsyncStorage, SecureStore e Crypto dependem do Android/iOS. Aqui cada um
 * e trocado por uma versao em memoria com o MESMO contrato - o codigo do app
 * nao sabe que esta sendo testado.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    __reset: () => store.clear(),
  };
});

jest.mock('expo-crypto', () => {
  const nodeCrypto = require('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digestStringAsync: jest.fn(async (_algorithm: string, data: string) =>
      nodeCrypto.createHash('sha256').update(data).digest('hex'),
    ),
    randomUUID: jest.fn(() => nodeCrypto.randomUUID()),
  };
});

// O SafeAreaProvider so renderiza os filhos depois de receber as medidas da
// tela do aparelho. No Jest nao ha aparelho: o duble oficial da biblioteca
// entrega medidas fixas de imediato.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
