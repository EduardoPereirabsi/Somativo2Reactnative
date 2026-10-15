import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback } from 'react';

import type { AppStackParamList } from '../navigation/types';

/**
 * RF02 - abre a Tela de Detalhes passando o `id` por `route.params`.
 *
 * Catalogo, busca, favoritos e assistidos navegam para o mesmo lugar do
 * mesmo jeito, entao a regra fica num hook so. A partir de uma aba, o
 * `navigate` sobe sozinho para o Stack pai, onde a rota `Detail` mora.
 */
export function useOpenDetail() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  return useCallback(
    (show: { id: number; name: string }) => {
      navigation.navigate('Detail', { id: show.id, name: show.name });
    },
    [navigation],
  );
}
