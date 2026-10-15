import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Collection } from '../models/collection';

/**
 * RF06 (baseline obrigatorio) - persistencia local com AsyncStorage.
 *
 * Cada usuario tem a colecao inteira serializada num unico JSON, sob a chave
 * `@maratona/collection/<userId>`. Como o volume e pequeno e sempre lido e
 * gravado por inteiro, um banco relacional (expo-sqlite) traria migracoes e
 * SQL sem nenhum ganho real.
 *
 * Note o que NAO fica aqui: a sessao do usuario vai para o SecureStore
 * (ver `auth/localAuth.ts`), porque o AsyncStorage nao e criptografado.
 */
const collectionKey = (userId: string) => `@maratona/collection/${userId}`;

/**
 * Le a colecao salva. Nunca lanca: um JSON corrompido (de uma versao antiga
 * do app, por exemplo) e descartado em vez de travar a abertura do app.
 */
export async function loadCollection(userId: string): Promise<Collection> {
  const raw = await AsyncStorage.getItem(collectionKey(userId));
  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Collection) : {};
  } catch {
    await AsyncStorage.removeItem(collectionKey(userId));
    return {};
  }
}

export async function saveCollection(
  userId: string,
  collection: Collection,
): Promise<void> {
  await AsyncStorage.setItem(collectionKey(userId), JSON.stringify(collection));
}
