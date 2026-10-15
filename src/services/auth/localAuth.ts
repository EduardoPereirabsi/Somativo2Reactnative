import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import {
  AuthError,
  normalizeEmail,
  validateSignUp,
  type AppUser,
  type AuthService,
} from './types';

/**
 * RF07 (baseline obrigatorio) - cadastro e login locais.
 *
 * Duas decisoes de seguranca, cada uma no armazenamento certo:
 *
 *  - A SENHA nunca e salva. Guardamos `SHA-256(salt + senha)`, com um salt
 *    aleatorio por usuario. Duas pessoas com a mesma senha geram hashes
 *    diferentes, e nao da para voltar do hash para a senha.
 *
 *  - A SESSAO (qual usuario esta logado) vai para o `expo-secure-store`,
 *    que usa o Keystore do Android / Keychain do iOS. O AsyncStorage e texto
 *    puro no disco; o SecureStore e criptografado pelo sistema.
 *
 * A lista de usuarios fica no AsyncStorage porque o SecureStore tem limite de
 * tamanho por chave e nela so ha hashes - nada sensivel em texto puro.
 */
const USERS_KEY = '@maratona/users';
const SESSION_KEY = 'maratona.session';

interface StoredUser {
  id: string;
  name: string;
  salt: string;
  hash: string;
}

type UserTable = Record<string, StoredUser>;

async function readUsers(): Promise<UserTable> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as UserTable;
  } catch {
    return {};
  }
}

function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}${password}`,
  );
}

function toAppUser(email: string, stored: StoredUser): AppUser {
  return { id: stored.id, name: stored.name, email, isCloud: false };
}

export function createLocalAuth(): AuthService {
  return {
    isCloud: false,

    async restore() {
      const email = await SecureStore.getItemAsync(SESSION_KEY);
      if (!email) return null;

      const stored = (await readUsers())[email];
      if (!stored) {
        // Sessao aponta para um usuario que nao existe mais: descarta.
        await SecureStore.deleteItemAsync(SESSION_KEY);
        return null;
      }
      return toAppUser(email, stored);
    },

    async signUp(name, email, password) {
      validateSignUp(name, email, password);
      const key = normalizeEmail(email);
      const users = await readUsers();

      if (users[key]) throw new AuthError('Já existe uma conta com este e-mail.');

      const salt = Crypto.randomUUID();
      users[key] = {
        id: `local-${Crypto.randomUUID()}`,
        name: name.trim(),
        salt,
        hash: await hashPassword(password, salt),
      };

      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
      await SecureStore.setItemAsync(SESSION_KEY, key);
      return toAppUser(key, users[key]);
    },

    async signIn(email, password) {
      const key = normalizeEmail(email);
      if (!key || !password) throw new AuthError('Informe e-mail e senha.');

      const stored = (await readUsers())[key];
      // Mensagem generica de proposito: nao revelamos se o e-mail existe.
      const invalid = new AuthError('E-mail ou senha inválidos.');
      if (!stored) throw invalid;
      if ((await hashPassword(password, stored.salt)) !== stored.hash) throw invalid;

      await SecureStore.setItemAsync(SESSION_KEY, key);
      return toAppUser(key, stored);
    },

    async signOut() {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    },
  };
}
