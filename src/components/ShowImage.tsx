import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, spacing } from '../theme/colors';

interface ShowImageProps {
  uri: string | null;
  /** Nome da serie, usado no rotulo de acessibilidade. */
  name: string;
  style?: StyleProp<ViewStyle>;
  /** Miniaturas pequenas mostram so o icone, sem a legenda. */
  compact?: boolean;
}

/**
 * Imagem de capa com placeholder (RF01 + RF10).
 *
 * Cai no placeholder em dois casos: a API nao mandou imagem, ou a URL falhou
 * ao carregar (`onError`). Em nenhum dos dois o layout quebra, porque o
 * placeholder ocupa exatamente o mesmo espaco da imagem.
 *
 * Guardamos QUAL uri falhou, e nao um simples booleano: se o componente for
 * reaproveitado para outra serie, a falha antiga nao contamina a nova.
 */
export function ShowImage({ uri, name, style, compact = false }: ShowImageProps) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const failed = uri !== null && failedUri === uri;

  if (!uri || failed) {
    return (
      <View
        style={[styles.box, styles.placeholder, style]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Imagem indisponível para ${name}`}
      >
        <Ionicons name="tv-outline" size={compact ? 22 : 34} color={colors.textMuted} />
        {compact ? null : <Text style={styles.placeholderText}>Sem imagem</Text>}
      </View>
    );
  }

  return (
    <View style={[styles.box, style]}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        onError={() => setFailedUri(uri)}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Capa da série ${name}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden', backgroundColor: colors.surfaceRaised },
  placeholder: { alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  placeholderText: { color: colors.textMuted, fontSize: 13 },
});
