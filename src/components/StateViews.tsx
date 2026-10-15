import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme/colors';
import type { IconName } from './IconButton';
import { PrimaryButton } from './PrimaryButton';

/**
 * RF09 - os estados visuais de qualquer tela que fala com a API, num lugar
 * so: carregando, erro com "Tentar novamente", vazio e aviso discreto.
 */

export function LoadingView({ message = 'Carregando...' }: { message?: string }) {
  return (
    <View
      style={styles.center}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      accessibilityLiveRegion="polite"
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.muted}>{message}</Text>
    </View>
  );
}

interface ErrorViewProps {
  message: string;
  onRetry?: () => void;
}

/** Erro que ocupa a tela, com acao de recuperacao (RF09). */
export function ErrorView({ message, onRetry }: ErrorViewProps) {
  return (
    <View style={styles.center}>
      {/* liveRegion: o TalkBack anuncia o erro assim que ele aparece. */}
      <View style={styles.message} accessibilityLiveRegion="assertive">
        <Ionicons name="cloud-offline-outline" size={48} color={colors.danger} />
        <Text style={styles.text}>{message}</Text>
      </View>
      {onRetry ? (
        <PrimaryButton label="Tentar novamente" icon="refresh" onPress={onRetry} />
      ) : null}
    </View>
  );
}

interface EmptyViewProps {
  icon: IconName;
  title: string;
  description: string;
  action?: ReactNode;
}

/** Estado vazio amigavel - usado como ListEmptyComponent (RF05). */
export function EmptyView({ icon, title, description, action }: EmptyViewProps) {
  return (
    <View style={styles.center}>
      <View importantForAccessibility="no-hide-descendants">
        <Ionicons name={icon} size={56} color={colors.textMuted} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.muted}>{description}</Text>
      {action}
    </View>
  );
}

interface InlineNoticeProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Aviso que NAO bloqueia a tela: o conteudo ja carregado continua visivel.
 * Usado quando a proxima pagina falha ou a sincronizacao com a nuvem cai.
 */
export function InlineNotice({ message, actionLabel = 'Tentar novamente', onAction }: InlineNoticeProps) {
  return (
    <View style={styles.notice} accessibilityLiveRegion="polite">
      <Text style={styles.noticeText}>{message}</Text>
      {onAction ? (
        <PrimaryButton label={actionLabel} variant="outline" onPress={onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  message: { alignItems: 'center', gap: spacing.md },
  text: { color: colors.text, fontSize: 16, textAlign: 'center' },
  title: { color: colors.text, fontSize: 19, fontWeight: '700', textAlign: 'center' },
  muted: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  notice: {
    backgroundColor: colors.dangerSurface,
    borderRadius: 12,
    padding: spacing.md,
    margin: spacing.md,
    gap: spacing.sm,
  },
  noticeText: { color: colors.text, fontSize: 14 },
});
