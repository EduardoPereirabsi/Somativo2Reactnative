import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../theme/colors';

/**
 * Exibida enquanto a sessao e os dados salvos sao lidos (RF06/RF07).
 *
 * E o que garante que o app nunca mostre a tela de login "piscando" para
 * quem ja estava logado, nem uma lista de favoritos vazia que logo depois
 * se enche: nada e exibido antes de os dados persistidos estarem prontos.
 */
export function SplashScreen() {
  return (
    <View
      style={styles.screen}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Abrindo o Maratona"
    >
      <Ionicons name="tv" size={64} color={colors.primary} />
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    backgroundColor: colors.background,
  },
});
