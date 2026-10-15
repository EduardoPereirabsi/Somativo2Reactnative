import Ionicons from '@expo/vector-icons/Ionicons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNavigationContainerRef, type RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Alert } from 'react-native';

import { IconButton, type IconName } from '../components/IconButton';
import { useAuth } from '../contexts/AuthContext';
import { useCollection } from '../contexts/CollectionContext';
import { CatalogScreen } from '../screens/CatalogScreen';
import { DetailScreen } from '../screens/DetailScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { WatchedScreen } from '../screens/WatchedScreen';
import { colors } from '../theme/colors';
import type { AppStackParamList, AuthStackParamList, TabParamList } from './types';

/**
 * Referencia ao NavigationContainer. Permite navegar e ler as opcoes da tela
 * atual de fora dos componentes - usada no teste de fluxo completo.
 */
export const navigationRef = createNavigationContainerRef<AppStackParamList>();

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  contentStyle: { backgroundColor: colors.background },
};

/** [icone ativo, icone inativo] de cada aba. */
const TAB_ICONS: Record<keyof TabParamList, [IconName, IconName]> = {
  Catalog: ['albums', 'albums-outline'],
  Search: ['search', 'search-outline'],
  Favorites: ['heart', 'heart-outline'],
  Watched: ['eye', 'eye-outline'],
};

/** RF07 - botao de logout, presente no cabecalho de todas as abas. */
function LogoutButton() {
  const { signOut, user } = useAuth();

  const confirm = () =>
    Alert.alert(
      'Sair da conta',
      `${user?.name ?? 'Você'}, seus favoritos e notas continuam salvos para quando você voltar.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: () => void signOut() },
      ],
    );

  return <IconButton icon="log-out-outline" accessibilityLabel="Sair da conta" onPress={confirm} />;
}

const renderLogout = () => <LogoutButton />;

function tabScreenOptions({ route }: { route: RouteProp<TabParamList> }) {
  const [active, inactive] = TAB_ICONS[route.name];
  return {
    ...stackScreenOptions,
    sceneStyle: { backgroundColor: colors.background },
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    headerRight: renderLogout,
    tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
      <Ionicons name={focused ? active : inactive} color={color} size={size} />
    ),
  };
}

function TabsNavigator() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Catalog" component={CatalogScreen} options={{ title: 'Catálogo' }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'Buscar' }} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Favoritos' }} />
      <Tab.Screen name="Watched" component={WatchedScreen} options={{ title: 'Assistidas' }} />
    </Tab.Navigator>
  );
}

/** Stack do app: as abas e, por cima delas, a Tela de Detalhes (RF02). */
function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={stackScreenOptions}>
      <AppStack.Screen name="Tabs" component={TabsNavigator} options={{ headerShown: false }} />
      <AppStack.Screen
        name="Detail"
        component={DetailScreen}
        // Titulo provisorio vindo do card; a tela troca pelo nome oficial
        // com navigation.setOptions assim que a requisicao termina.
        options={({ route }) => ({ title: route.params.name ?? 'Detalhes' })}
      />
    </AppStack.Navigator>
  );
}

/** Stack de autenticacao: login e cadastro. */
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={stackScreenOptions}>
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <AuthStack.Screen name="Register" component={RegisterScreen} options={{ title: 'Criar conta' }} />
    </AuthStack.Navigator>
  );
}

/**
 * RF07 - navegacao condicional.
 *
 * Nao existe uma pilha unica com Login e Catalogo lado a lado: existem DUAS
 * pilhas, e so uma e renderizada por vez, decidida pelo AuthContext.
 *
 *  - Ao entrar, o Stack de login e desmontado e o do app e montado.
 *    O botao voltar do Android nao tem para onde voltar: o login nao esta
 *    mais na pilha.
 *  - Ao sair, acontece o contrario. Por isso o logout nao usa
 *    navigation.navigate('Login'), que nem funcionaria: a rota Login nao
 *    existe dentro do Stack do app.
 */
export function RootNavigator() {
  const { status } = useAuth();
  const { ready } = useCollection();

  // RF06 - nada aparece antes de sessao E dados salvos estarem carregados.
  if (status === 'restoring' || (status === 'signedIn' && !ready)) {
    return <SplashScreen />;
  }
  return status === 'signedIn' ? <AppNavigator /> : <AuthNavigator />;
}
