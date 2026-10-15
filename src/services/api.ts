import { create, isAxiosError, isCancel } from 'axios';

/**
 * Cliente HTTP unico do app (Axios), configurado uma vez so.
 *
 * Nenhuma tela importa o axios diretamente: todas passam por
 * `services/tvmaze.ts`, que por sua vez usa esta instancia. Assim URL base,
 * timeout e traducao de erro ficam num lugar so.
 */
export const api = create({
  baseURL: 'https://api.tvmaze.com',
  timeout: 15000,
});

export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'notFound'
  | 'rateLimit'
  | 'server'
  | 'canceled'
  | 'unknown';

/**
 * Erro ja traduzido para o usuario final (RF09).
 *
 * As telas mostram `message` direto, sem nunca exibir texto tecnico como
 * "Network Error" ou "Request failed with status code 503".
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;

  constructor(message: string, kind: ApiErrorKind) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
  }
}

export function isCanceled(error: unknown): boolean {
  return error instanceof ApiError
    ? error.kind === 'canceled'
    : isCancel(error);
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (isCancel(error)) {
    return new ApiError('Requisição cancelada.', 'canceled');
  }

  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError(
        'O servidor demorou demais para responder. Tente novamente.',
        'timeout',
      );
    }

    const status = error.response?.status;
    if (status === undefined) {
      return new ApiError(
        'Sem conexão com a internet. Verifique sua rede e tente novamente.',
        'network',
      );
    }
    if (status === 404) {
      return new ApiError('Não encontramos essa série.', 'notFound');
    }
    if (status === 429) {
      // A TVMaze limita a 20 requisicoes a cada 10 segundos por IP.
      return new ApiError(
        'Muitas requisições seguidas. Aguarde alguns segundos e tente novamente.',
        'rateLimit',
      );
    }
    if (status >= 500) {
      return new ApiError(
        'O serviço de séries está fora do ar. Tente novamente em instantes.',
        'server',
      );
    }
  }

  return new ApiError(
    'Ocorreu um erro inesperado. Tente novamente.',
    'unknown',
  );
}
