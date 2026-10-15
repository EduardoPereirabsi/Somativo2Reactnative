import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  type TextInput,
} from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { useAuth } from '../contexts/AuthContext';
import { MIN_PASSWORD } from '../services/auth/types';
import { colors, spacing } from '../theme/colors';

/**
 * RF07 - cadastro. Usa o mesmo `AuthContext` do login: se houver Supabase,
 * a conta e criada no servidor; senao, localmente com a senha em hash.
 *
 * Cadastro bem-sucedido ja abre sessao, e o RootNavigator troca para o Stack
 * do app - esta tela some junto com o Stack de autenticacao.
 */
export function RegisterScreen() {
  const { signUp, busy, error } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const submit = () => void signUp(name, email, password);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField
          label="Nome completo"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <TextField
          ref={emailRef}
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <Text style={styles.hint}>Mínimo de {MIN_PASSWORD} caracteres.</Text>

        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="assertive" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <PrimaryButton label="Criar conta e entrar" onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md },
  hint: { color: colors.textMuted, fontSize: 13, marginTop: -spacing.sm },
  error: { color: colors.danger, fontSize: 15 },
});
