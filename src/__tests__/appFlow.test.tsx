import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

import App from '../../App';
import type { ApiShow } from '../models/show';
import { navigationRef } from '../navigation/RootNavigator';
import { ApiError } from '../services/api';
import * as tvmaze from '../services/tvmaze';

/**
 * Teste de fluxo completo: o app inteiro, de verdade - navegacao, Contexts,
 * AsyncStorage e SecureStore (em memoria) -, trocando SO a API por respostas
 * fixas. Cada cenario segue o caminho que o usuario faz, na ordem dos RFs.
 */
jest.mock('../services/tvmaze', () => {
  const actual = jest.requireActual('../services/tvmaze');
  return {
    ...actual,
    fetchShowsPage: jest.fn(),
    fetchShow: jest.fn(),
    searchShows: jest.fn(),
  };
});

const api = tvmaze as jest.Mocked<typeof tvmaze>;

const RAW: Record<number, ApiShow> = {
  169: {
    id: 169,
    name: 'Breaking Bad',
    genres: ['Drama', 'Crime'],
    status: 'Ended',
    premiered: '2008-01-20',
    rating: { average: 9.2 },
    network: { name: 'AMC' },
    summary: '<p><b>Breaking Bad</b> follows a chemistry teacher&#39;s fall.</p>',
    image: null,
  },
  526: { id: 526, name: 'The Office', genres: ['Comedy'], image: null, summary: '<p>Mockumentary.</p>' },
  17861: { id: 17861, name: 'Dark', genres: ['Drama', 'Mystery'], image: null, summary: '' },
};

function useFakeApi() {
  api.fetchShowsPage.mockImplementation(async (page: number) =>
    page === 0
      ? { shows: [RAW[169], RAW[526]].map(tvmaze.toShow), isLastPage: false }
      : { shows: [tvmaze.toShow(RAW[17861])], isLastPage: true },
  );
  api.fetchShow.mockImplementation(async (id: number) => tvmaze.toShow(RAW[id]));
  api.searchShows.mockImplementation(async (term: string) =>
    term.toLowerCase().includes('office') ? [tvmaze.toShow(RAW[526])] : [],
  );
}

async function signUp() {
  await fireEvent.press(await screen.findByText('Criar uma conta'));
  await fireEvent.changeText(await screen.findByLabelText('Nome completo'), 'Eduardo Pereira');
  await fireEvent.changeText(screen.getByLabelText('E-mail'), 'eduardo@exemplo.com');
  await fireEvent.changeText(screen.getByLabelText('Senha'), 'senha123');
  await fireEvent.press(screen.getByText('Criar conta e entrar'));
  await screen.findByText('Breaking Bad');
}

async function openTab(title: 'Catálogo' | 'Buscar' | 'Favoritos' | 'Assistidas') {
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${title}`) }));
}

async function openShow(name: string) {
  await fireEvent.press(screen.getByLabelText(new RegExp(`^${name},`)));
  await screen.findByText('Sinopse');
}

async function goBack() {
  await act(async () => navigationRef.goBack());
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  (SecureStore as unknown as { __reset: () => void }).__reset();
  useFakeApi();
});

it('RF07 - sem sessao, o catalogo nao aparece; depois do cadastro, aparece', async () => {
  await render(<App />);

  expect(await screen.findByText('Entrar')).toBeTruthy();
  expect(screen.queryByText('Breaking Bad')).toBeNull();
  expect(api.fetchShowsPage).not.toHaveBeenCalled();

  await signUp();

  expect(screen.getByText('The Office')).toBeTruthy();
});

it('RF01 - rolagem infinita anexa a proxima pagina e para no fim', async () => {
  await render(<App />);
  await signUp();
  expect(screen.queryByText('Dark')).toBeNull();

  // O que a FlatList faz quando o usuario chega perto do fim da lista.
  await fireEvent(screen.getByTestId('catalog-list'), 'endReached');

  expect(await screen.findByText('Dark')).toBeTruthy();
  expect(screen.getByText('Breaking Bad')).toBeTruthy(); // a pagina 1 continua la
  expect(screen.getByText('Fim do catálogo · 3 séries')).toBeTruthy();
  expect(api.fetchShowsPage).toHaveBeenLastCalledWith(1, expect.any(Object));
});

it('RF02/RF03 - detalhes: titulo dinamico, segunda requisicao e sinopse sem HTML', async () => {
  await render(<App />);
  await signUp();

  await openShow('Breaking Bad');

  expect(api.fetchShow).toHaveBeenCalledWith(169, expect.any(Object));
  expect(navigationRef.getCurrentRoute()?.params).toEqual({ id: 169, name: 'Breaking Bad' });
  expect(navigationRef.getCurrentOptions()).toMatchObject({ title: 'Breaking Bad' });
  expect(screen.getByText("Breaking Bad follows a chemistry teacher's fall.")).toBeTruthy();
  expect(screen.queryByText(/<p>|<b>/)).toBeNull();
});

it('RF04/RF05 - favoritar nos detalhes reflete no card e na tela de Favoritos', async () => {
  await render(<App />);
  await signUp();
  await openShow('Breaking Bad');

  await fireEvent.press(screen.getByLabelText('Adicionar Breaking Bad aos favoritos'));
  const button = screen.getByLabelText('Remover Breaking Bad dos favoritos');
  expect(button.props.accessibilityState).toMatchObject({ selected: true }); // RF10

  await goBack();
  // Mesmo estado, outra tela: o card do catalogo agora diz "favorita".
  expect(screen.getByLabelText(/^Breaking Bad,.*favorita/)).toBeTruthy();

  await openTab('Favoritos');
  expect(await screen.findByText('Breaking Bad')).toBeTruthy();

  // Desfavoritar ali mesmo: a lista se atualiza sozinha e mostra o vazio.
  await fireEvent.press(screen.getByLabelText('Remover Breaking Bad dos favoritos'));
  expect(await screen.findByText('Nenhum favorito ainda')).toBeTruthy();
});

it('RF07 - marcar como assistida com nota e ver na tela de Assistidas', async () => {
  await render(<App />);
  await signUp();
  await openShow('The Office');

  await fireEvent.press(screen.getByLabelText('Dar nota 4 de 5'));
  expect(screen.getByLabelText('Dar nota 4 de 5').props.accessibilityState).toMatchObject({
    selected: true,
  });
  expect(screen.getByText('Você deu 4 de 5.')).toBeTruthy();

  await goBack();
  await openTab('Assistidas');
  expect(await screen.findByLabelText('The Office, sua nota 4 de 5')).toBeTruthy();
});

it('RF06 - ao reabrir o app, a sessao e os favoritos continuam la', async () => {
  const first = await render(<App />);
  await signUp();
  await openShow('Breaking Bad');
  await fireEvent.press(screen.getByLabelText('Adicionar Breaking Bad aos favoritos'));
  await first.unmount();

  // App "fechado e aberto de novo": arvore nova, mesmo armazenamento.
  await render(<App />);

  expect(await screen.findByText('Breaking Bad')).toBeTruthy();
  expect(screen.queryByText('Entrar')).toBeNull(); // foi direto ao catalogo
  await openTab('Favoritos');
  expect(await screen.findByText('Breaking Bad')).toBeTruthy();
});

it('RF08 - busca mostra uma LISTA de resultados e abre o detalhe ao tocar', async () => {
  await render(<App />);
  await signUp();
  await openTab('Buscar');

  await fireEvent.changeText(screen.getByLabelText('Nome da série'), 'office');
  await fireEvent.press(screen.getByRole('button', { name: 'Buscar' }));

  expect(await screen.findByText('1 de 1 resultados para “office”')).toBeTruthy();
  await openShow('The Office');
  expect(navigationRef.getCurrentOptions()).toMatchObject({ title: 'The Office' });
});

it('RF08 - busca sem resultado mostra mensagem clara', async () => {
  await render(<App />);
  await signUp();
  await openTab('Buscar');

  await fireEvent.changeText(screen.getByLabelText('Nome da série'), 'zzzz');
  await fireEvent.press(screen.getByRole('button', { name: 'Buscar' }));

  expect(await screen.findByText('Nenhuma série encontrada')).toBeTruthy();
});

it('RF09 - falha de rede nos detalhes mostra erro e "Tentar novamente" funciona', async () => {
  api.fetchShow.mockRejectedValueOnce(
    new ApiError('Sem conexão com a internet. Verifique sua rede e tente novamente.', 'network'),
  );
  await render(<App />);
  await signUp();

  await fireEvent.press(screen.getByLabelText(/^Breaking Bad,/));
  expect(await screen.findByText(/Sem conexão com a internet/)).toBeTruthy();

  await fireEvent.press(screen.getByText('Tentar novamente'));
  expect(await screen.findByText('Sinopse')).toBeTruthy();
});

it('RF07 - logout volta para o login sem navigate("Login")', async () => {
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.find((b) => b.style === 'destructive')?.onPress?.();
  });
  await render(<App />);
  await signUp();

  await fireEvent.press(screen.getByLabelText('Sair da conta'));

  expect(await screen.findByText('Entrar')).toBeTruthy();
  expect(screen.queryByText('Breaking Bad')).toBeNull();
});
