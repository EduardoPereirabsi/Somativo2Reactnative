export interface AppUser {
  id: string;
  name: string;
  email: string;
  /** `true` quando a sessao e autenticada de verdade no Supabase (bonus). */
  isCloud: boolean;
}

/** Erro de autenticacao ja traduzido para o usuario final (RF09). */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Contrato unico de autenticacao (RF07).
 *
 * Existem duas implementacoes - local (baseline) e Supabase (bonus) - e o
 * `AuthContext` depende so desta interface. Trocar uma pela outra nao muda
 * nenhuma tela.
 */
export interface AuthService {
  readonly isCloud: boolean;
  /** Sessao salva de uma abertura anterior; `null` = precisa fazer login. */
  restore(): Promise<AppUser | null>;
  signIn(email: string, password: string): Promise<AppUser>;
  signUp(name: string, email: string, password: string): Promise<AppUser>;
  signOut(): Promise<void>;
}

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const MIN_PASSWORD = 6;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Validacao comum aos dois modos, feita antes de qualquer chamada. */
export function validateSignUp(name: string, email: string, password: string) {
  if (name.trim().length < 2) throw new AuthError('Informe seu nome.');
  if (!EMAIL_PATTERN.test(normalizeEmail(email))) {
    throw new AuthError('Informe um e-mail válido.');
  }
  if (password.length < MIN_PASSWORD) {
    throw new AuthError(`A senha precisa ter ao menos ${MIN_PASSWORD} caracteres.`);
  }
}
