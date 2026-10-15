import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { KeyboardAnchor } from './src/components/KeyboardAnchor';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { CollectionProvider } from './src/contexts/CollectionContext';
import { navigationRef, RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme/colors';

const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.heart,
  },
};

/**
 * Liga a colecao ao usuario da sessao.
 *
 * O `key={user.id}` faz o React DESCARTAR o CollectionProvider e criar um
 * novo sempre que o usuario muda (login, logout, troca de conta). O estado
 * nasce zerado e e carregado do disco daquele usuario - sem nenhum codigo de
 * "limpeza" manual, e sem chance de a colecao de uma conta aparecer na outra.
 */
function SessionCollection({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <CollectionProvider key={user?.id ?? 'sem-sessao'} user={user}>
      {children}
    </CollectionProvider>
  );
}

/**
 * Ordem dos providers = ordem das dependencias:
 * a sessao (Auth) vem antes da colecao, que depende de quem esta logado.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SessionCollection>
          <NavigationContainer ref={navigationRef} theme={navigationTheme}>
            <StatusBar style="light" />
            <RootNavigator />
          </NavigationContainer>
        </SessionCollection>
      </AuthProvider>
      <KeyboardAnchor />
    </SafeAreaProvider>
  );
}
