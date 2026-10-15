import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, TextInput } from 'react-native';

/**
 * Contorno de um bug do Android 16 com o react-native-screens
 * (software-mansion/react-native-screens#4720, ainda aberto).
 *
 * Quando a tela que tinha um campo de texto focado sai da hierarquia - trocar
 * de aba, abrir os detalhes -, o teclado do Android continua ligado ao campo
 * que nao existe mais e passa a "engolir" o botao voltar: o app inteiro para
 * de voltar. `blur()` e `Keyboard.dismiss()` nao resolvem.
 *
 * Este campo invisivel fica montado na raiz do app, fora dos navegadores.
 * Quando uma tela com campo usado perde o foco, `rebindKeyboardToAnchor()`
 * foca e desfoca este campo: o Android religa o teclado a uma view que
 * continua na tela, e o botao voltar volta a funcionar.
 */
let anchor: TextInput | null = null;

export function rebindKeyboardToAnchor() {
  if (!anchor) return;
  anchor.focus();
  anchor.blur();
}

export function KeyboardAnchor() {
  const ref = useRef<TextInput>(null);

  useEffect(() => {
    const input = ref.current;
    anchor = input;
    return () => {
      if (anchor === input) anchor = null;
    };
  }, []);

  if (Platform.OS !== 'android') return null;

  return (
    <TextInput
      ref={ref}
      style={styles.anchor}
      // Recebe o foco sem abrir o teclado.
      showSoftInputOnFocus={false}
      caretHidden
      // Fora da arvore de acessibilidade: o leitor de tela nunca chega aqui.
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', top: 0, left: 0, width: 1, height: 1, opacity: 0 },
});
