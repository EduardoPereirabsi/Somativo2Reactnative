import type { SupabaseClient, User } from '@supabase/supabase-js';

import {
  AuthError,
  normalizeEmail,
  validateSignUp,
  type AppUser,
  type AuthService,
} from './types';

/**
 * RF07 (BONUS) - autenticacao real com Supabase Auth.
 *
 * Implementa o mesmo `AuthService` do login local: as telas de login e
 * cadastro sao reaproveitadas sem nenhum `if` sobre o modo.
 * A sessao e persistida pelo proprio cliente Supabase (configurado com
 * AsyncStorage em `services/supabase.ts`).
 */
function toAppUser(user: User): AppUser {
  const meta = user.user_metadata as { display_name?: string } | undefined;
  return {
    id: user.id,
    name: meta?.display_name || user.email || 'Usuário',
    email: user.email ?? '',
    isCloud: true,
  };
}

/** Traduz as mensagens do Supabase (em ingles) para o usuario final. */
function translate(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login')) return 'E-mail ou senha inválidos.';
  if (lower.includes('already registered')) return 'Já existe uma conta com este e-mail.';
  if (lower.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (lower.includes('password')) return 'A senha precisa ter ao menos 6 caracteres.';
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Sem conexão com o servidor. Verifique sua internet.';
  }
  return 'Não foi possível concluir. Tente novamente.';
}

export function createSupabaseAuth(client: SupabaseClient): AuthService {
  return {
    isCloud: true,

    async restore() {
      const { data } = await client.auth.getSession();
      return data.session ? toAppUser(data.session.user) : null;
    },

    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({
        email: normalizeEmail(email),
        password,
      });
      if (error) throw new AuthError(translate(error.message));
      return toAppUser(data.user);
    },

    async signUp(name, email, password) {
      validateSignUp(name, email, password);
      const { data, error } = await client.auth.signUp({
        email: normalizeEmail(email),
        password,
        options: { data: { display_name: name.trim() } },
      });
      if (error) throw new AuthError(translate(error.message));
      // Com "Confirm email" ligado no painel, o usuario e criado sem sessao.
      if (!data.session || !data.user) {
        throw new AuthError('Conta criada. Confirme seu e-mail e depois entre.');
      }
      return toAppUser(data.user);
    },

    async signOut() {
      await client.auth.signOut();
    },
  };
}
