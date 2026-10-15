import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { createLocalAuth } from '../localAuth';
import { AuthError } from '../types';

beforeEach(async () => {
  await AsyncStorage.clear();
  (SecureStore as unknown as { __reset: () => void }).__reset();
});

describe('login local (RF07 baseline)', () => {
  it('cadastra, mantem a sessao e restaura ao reabrir', async () => {
    const auth = createLocalAuth();
    const user = await auth.signUp('Eduardo Pereira', 'Edu@Exemplo.com', 'senha123');

    expect(user).toMatchObject({ name: 'Eduardo Pereira', email: 'edu@exemplo.com', isCloud: false });

    // Simula reabrir o app: outra instancia, mesmo armazenamento.
    const restored = await createLocalAuth().restore();
    expect(restored?.email).toBe('edu@exemplo.com');
  });

  it('NUNCA grava a senha em texto puro', async () => {
    await createLocalAuth().signUp('Eduardo', 'edu@exemplo.com', 'senha-secreta-123');

    const raw = (await AsyncStorage.getItem('@maratona/users')) ?? '';
    expect(raw).not.toContain('senha-secreta-123');
    const stored = JSON.parse(raw)['edu@exemplo.com'];
    expect(stored.hash).toMatch(/^[0-9a-f]{64}$/); // SHA-256 em hexadecimal
    expect(stored.salt).toBeTruthy();
  });

  it('a sessao fica no SecureStore, nao no AsyncStorage', async () => {
    await createLocalAuth().signUp('Eduardo', 'edu@exemplo.com', 'senha123');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('maratona.session', 'edu@exemplo.com');
  });

  it('mesma senha, usuarios diferentes -> hashes diferentes (salt)', async () => {
    const auth = createLocalAuth();
    await auth.signUp('Ana', 'ana@exemplo.com', 'mesmaSenha');
    await auth.signUp('Bia', 'bia@exemplo.com', 'mesmaSenha');

    const users = JSON.parse((await AsyncStorage.getItem('@maratona/users')) ?? '{}');
    expect(users['ana@exemplo.com'].hash).not.toBe(users['bia@exemplo.com'].hash);
  });

  it('recusa senha errada com mensagem generica', async () => {
    const auth = createLocalAuth();
    await auth.signUp('Eduardo', 'edu@exemplo.com', 'senha123');
    await auth.signOut();

    await expect(auth.signIn('edu@exemplo.com', 'errada')).rejects.toThrow('E-mail ou senha inválidos.');
    await expect(auth.signIn('ninguem@exemplo.com', 'senha123')).rejects.toThrow(
      'E-mail ou senha inválidos.',
    );
  });

  it('logout apaga a sessao', async () => {
    const auth = createLocalAuth();
    await auth.signUp('Eduardo', 'edu@exemplo.com', 'senha123');
    await auth.signOut();
    await expect(auth.restore()).resolves.toBeNull();
  });

  it('valida o cadastro antes de gravar', async () => {
    const auth = createLocalAuth();
    await expect(auth.signUp('E', 'edu@exemplo.com', 'senha123')).rejects.toBeInstanceOf(AuthError);
    await expect(auth.signUp('Eduardo', 'sem-arroba', 'senha123')).rejects.toBeInstanceOf(AuthError);
    await expect(auth.signUp('Eduardo', 'edu@exemplo.com', '123')).rejects.toBeInstanceOf(AuthError);
  });
});
