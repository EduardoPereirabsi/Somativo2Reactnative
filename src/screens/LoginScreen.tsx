import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '../components/IconButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { useAuth } from '../contexts/AuthContext';
import type { AuthScreenProps } from '../navigation/types';
import { colors, spacing } from '../theme/colors';

/**
 * RF07 - porta de entrada. So existe dentro do Stack de autenticacao, que o
 * RootNavigator renderiza enquanto NAO ha sessao.
 *
 * Note que, ao entrar com sucesso, esta tela nao chama navigate nenhum: o
 * AuthContext muda de estado e o RootNavigator troca de Stack sozinho.
 */
export function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const { signIn, busy, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hidden, setHidden] = useState(true);
  const passwordRef = useRef<TextInput>(null);

  const submit = () => void signIn(email, password);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Tudo rola: com a fonte do sistema no maximo, nada fica cortado. */}
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand} accessible accessibilityRole="header" accessibilityLabel="Maratona">
            <Ionicons name="tv" size={56} color={colors.primary} />
            <Text style={styles.title}>Maratona</Text>
          </View>
          <Text style={styles.subtitle}>
            Seu catálogo de séries: favorite, marque o que já assistiu e dê sua nota.
          </Text>

          <TextField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <View>
            <TextField
              ref={passwordRef}
              label="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={hidden}
              autoCapitalize="none"
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={submit}
              style={styles.passwordInput}
            />
            <IconButton
              icon={hidden ? 'eye-outline' : 'eye-off-outline'}
              accessibilityLabel={hidden ? 'Mostrar senha' : 'Ocultar senha'}
              onPress={() => setHidden((value) => !value)}
              style={styles.reveal}
            />
          </View>

          {error ? (
            <Text style={styles.error} accessibilityLiveRegion="assertive" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          {/* RF09 - ActivityIndicator dentro do botao enquanto autentica. */}
          <PrimaryButton label="Entrar" onPress={submit} loading={busy} />
          <PrimaryButton
            label="Criar uma conta"
            variant="outline"
            disabled={busy}
            onPress={() => {
              clearError();
              navigation.navigate('Register');
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  brand: { alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text, fontSize: 32, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 16, textAlign: 'center', marginBottom: spacing.sm },
  passwordInput: { paddingRight: 52 },
  reveal: { position: 'absolute', right: 4, bottom: 2 },
  error: { color: colors.danger, fontSize: 15 },
});
