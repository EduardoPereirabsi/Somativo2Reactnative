import { useCallback, useEffect, useState } from 'react';

import { isCanceled, toApiError } from '../services/api';

/**
 * RF09 - os tres estados de uma requisicao, como uniao discriminada.
 *
 * O TypeScript garante que a tela nunca tenha "dados e erro ao mesmo tempo":
 * so existe `data` quando `status === 'success'`, e so existe `error` quando
 * `status === 'error'`.
 */
export type FetchState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: T };

export type Fetcher<T> = (signal: AbortSignal) => Promise<T>;

interface Settled<T> {
  fetcher: Fetcher<T>;
  attempt: number;
  state: FetchState<T>;
}

const LOADING = { status: 'loading' } as const;

/**
 * Hook generico de requisicao com loading / error / data (RF09).
 *
 * O `fetcher` precisa ser estavel - envolva-o em `useCallback` com as
 * dependencias certas (ex.: o id da serie). Quando ele muda, uma nova
 * requisicao e feita.
 *
 * Tres cuidados de ciclo de vida:
 *  1. Cada requisicao recebe um AbortSignal; o cleanup do efeito a cancela.
 *     Sair da tela antes da resposta nao gera atualizacao de estado em
 *     componente desmontado, nem requisicao "orfa" rodando a toa.
 *  2. O resultado guarda QUAL fetcher e QUAL tentativa o produziu. Se a tela
 *     pedir outra coisa, o resultado antigo e ignorado e a tela volta a
 *     "carregando" sozinha - sem setState sincrono dentro do efeito.
 *  3. `reload` (botao "Tentar novamente") so incrementa a tentativa.
 */
export function useFetch<T>(fetcher: Fetcher<T>) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetcher(controller.signal)
      .then((data) => {
        setSettled({ fetcher, attempt, state: { status: 'success', data } });
      })
      .catch((error: unknown) => {
        if (isCanceled(error)) return;
        setSettled({
          fetcher,
          attempt,
          state: { status: 'error', error: toApiError(error).message },
        });
      });

    return () => controller.abort();
  }, [fetcher, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  const isCurrent = settled?.fetcher === fetcher && settled.attempt === attempt;
  const state: FetchState<T> = isCurrent && settled ? settled.state : LOADING;

  return { ...state, reload } as FetchState<T> & { reload: () => void };
}
