import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import type { Collection, CollectionEntry } from '../models/collection';

/**
 * RF06/RF07 (BONUS) - nuvem e autenticacao real com Supabase.
 *
 * As credenciais vem de variaveis de ambiente `EXPO_PUBLIC_...`, definidas
 * no arquivo `.env` - que esta no .gitignore e NUNCA e commitado.
 *
 * Elas precisam ser lidas exatamente como `process.env.EXPO_PUBLIC_NOME`:
 * o Expo substitui esse texto literal no momento do build. Desestruturar
 * (`const { X } = process.env`) quebraria essa substituicao.
 *
 * Sem as variaveis, `supabase` fica `null` e o app inteiro roda em modo
 * local - quem clonar o repositorio consegue usar tudo sem conta nenhuma.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export const isCloudEnabled = supabase !== null;

// Recomendacao oficial do Supabase para React Native: so renovar o token
// enquanto o app esta em primeiro plano.
if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/**
 * Contrato da colecao na nuvem. O `CollectionContext` depende so desta
 * interface - o que permite testar a sincronizacao com um falso, sem rede.
 */
export interface CloudCollection {
  fetchAll(userId: string): Promise<Collection>;
  upsert(userId: string, entry: CollectionEntry): Promise<void>;
  remove(userId: string, showId: number): Promise<void>;
}

const TABLE = 'collection_items';

interface Row {
  user_id: string;
  show_id: number;
  is_favorite: boolean;
  is_watched: boolean;
  personal_rating: number | null;
  payload: CollectionEntry['show'];
  updated_at: string;
}

function createSupabaseCollection(client: SupabaseClient): CloudCollection {
  return {
    async fetchAll(userId) {
      const { data, error } = await client
        .from(TABLE)
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;

      const result: Collection = {};
      for (const row of (data ?? []) as Row[]) {
        result[String(row.show_id)] = {
          show: row.payload,
          favorite: row.is_favorite,
          watched: row.is_watched,
          personalRating: row.personal_rating,
          updatedAt: Date.parse(row.updated_at) || 0,
        };
      }
      return result;
    },

    async upsert(userId, entry) {
      const row: Row = {
        user_id: userId,
        show_id: entry.show.id,
        is_favorite: entry.favorite,
        is_watched: entry.watched,
        personal_rating: entry.personalRating,
        payload: entry.show,
        updated_at: new Date(entry.updatedAt).toISOString(),
      };
      const { error } = await client
        .from(TABLE)
        .upsert(row, { onConflict: 'user_id,show_id' });
      if (error) throw error;
    },

    async remove(userId, showId) {
      const { error } = await client
        .from(TABLE)
        .delete()
        .eq('user_id', userId)
        .eq('show_id', showId);
      if (error) throw error;
    },
  };
}

export const supabaseCollection: CloudCollection | null = supabase
  ? createSupabaseCollection(supabase)
  : null;
