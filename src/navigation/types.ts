import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** Stack de autenticacao - so existe enquanto NAO ha sessao (RF07). */
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

/** Abas do app logado. */
export type TabParamList = {
  Catalog: undefined;
  Search: undefined;
  Favorites: undefined;
  Watched: undefined;
};

/**
 * Stack do app - so existe quando HA sessao (RF07).
 *
 * RF02: a tela de detalhes recebe o `id` por `route.params`. O `name` e
 * opcional e serve so para o titulo aparecer na hora, antes da requisicao.
 */
export type AppStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  Detail: { id: number; name?: string };
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;

export type DetailScreenProps = NativeStackScreenProps<AppStackParamList, 'Detail'>;

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<AppStackParamList>
>;
