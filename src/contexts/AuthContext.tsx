import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { createLocalAuth } from '../services/auth/localAuth';
import { createSupabaseAuth } from '../services/auth/supabaseAuth';
import { AuthError, type AppUser, type AuthService } from '../services/auth/types';
import { supabase } from '../services/supabase';

/**
 * Estados da sessao (RF07 - navegacao condicional).
 *
 * `restoring` existe para o app nao "piscar" a tela de login enquanto le a
 * sessao salva: quem ja estava logado vai direto ao catalogo.
 */
export type AuthStatus = 'restoring' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  user: AppUser | null;
  /** RF09 - o botao de entrar vira ActivityIndicator enquanto `true`. */
  busy: boolean;
  /** RF09 - mensagem amigavel exibida no formulario. */
  error: string | null;
  isCloud: boolean;
  signIn(email: string, password: string): Promise<boolean>;
  signUp(name: string, email: string, password: string): Promise<boolean>;
  signOut(): Promise<void>;
  clearError(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Nuvem se houver credenciais no .env; senao, login local. */
function defaultAuthService(): AuthService {
  return supabase ? createSupabaseAuth(supabase) : createLocalAuth();
}

interface AuthProviderProps {
  children: ReactNode;
  /** Permite injetar um servico falso nos testes. */
  service?: AuthService;
}

export function AuthProvider({ children, service }: AuthProviderProps) {
  // Criado uma unica vez: o `useState` com inicializador nao recria o
  // servico a cada render.
  const [authService] = useState<AuthService>(() => service ?? defaultAuthService());

  const [status, setStatus] = useState<AuthStatus>('restoring');
  const [user, setUser] = useState<AppUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // RF07 - a sessao persiste: ao reabrir o app, restaura quem estava logado.
  useEffect(() => {
    let active = true;
    authService
      .restore()
      .then((restored) => {
        if (!active) return;
        setUser(restored);
        setStatus(restored ? 'signedIn' : 'signedOut');
      })
      .catch(() => {
        if (active) setStatus('signedOut');
      });
    // Cleanup: se o provider desmontar antes da leitura terminar, a resposta
    // atrasada e ignorada em vez de atualizar estado de algo que nao existe.
    return () => {
      active = false;
    };
  }, [authService]);

  /** Envolve login e cadastro com o mesmo tratamento de `busy` e `error`. */
  const run = useCallback(async (operation: () => Promise<AppUser>) => {
    setBusy(true);
    setError(null);
    try {
      const signedIn = await operation();
      setUser(signedIn);
      setStatus('signedIn');
      return true;
    } catch (err) {
      setError(
        err instanceof AuthError
          ? err.message
          : 'Não foi possível conectar. Verifique sua internet e tente novamente.',
      );
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const signIn = useCallback(
    (email: string, password: string) => run(() => authService.signIn(email, password)),
    [run, authService],
  );

  const signUp = useCallback(
    (name: string, email: string, password: string) =>
      run(() => authService.signUp(name, email, password)),
    [run, authService],
  );

  const signOut = useCallback(async () => {
    await authService.signOut();
    // Basta mudar o estado: o RootNavigator troca o Stack do app pelo Stack
    // de login sozinho. Nenhum navigation.navigate('Login') e necessario.
    setUser(null);
    setError(null);
    setStatus('signedOut');
  }, [authService]);

  const clearError = useCallback(() => setError(null), []);

  // `useMemo` evita entregar um objeto novo a cada render do provider - o
  // que obrigaria TODOS os consumidores a renderizar de novo sem motivo.
  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      busy,
      error,
      isCloud: authService.isCloud,
      signIn,
      signUp,
      signOut,
      clearError,
    }),
    [status, user, busy, error, authService, signIn, signUp, signOut, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return context;
}
