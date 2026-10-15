# Maratona

Aplicativo React Native + Expo de catálogo interativo de séries, desenvolvido
para o **Projeto Somativo 2 (RA2) — Catálogo Interativo 2.0** da disciplina de
Desenvolvimento Mobile Híbrido (Bacharelado em Sistemas de Informação).

O app consome a [API pública do TVmaze](https://www.tvmaze.com/api) e permite
rolar um catálogo infinito de séries, buscar por nome, ver detalhes, favoritar,
marcar o que já assistiu e dar uma nota de 1 a 5 — tudo protegido por login e
preservado quando o app é fechado e aberto de novo.

| | |
|---|---|
| **Tema** | Catálogo de séries de TV |
| **API** | `https://api.tvmaze.com` — pública, gratuita, sem chave |
| **Navegação** | React Navigation 7 — `native-stack` + `bottom-tabs` |
| **Estado global** | Context API (`AuthContext`, `CollectionContext`) + hooks próprios |
| **Persistência** | `AsyncStorage` **+ bônus** nuvem (Supabase / Postgres) |
| **Login** | Local (SHA-256 + salt, sessão no `expo-secure-store`) **+ bônus** Supabase Auth |
| **Stack** | Expo SDK 57, React Native 0.86, React 19.2, TypeScript (strict) |

---

## Sumário

- [Como rodar](#como-rodar)
- [Ativando o bônus (Supabase)](#ativando-o-bônus-supabase)
- [Arquitetura](#arquitetura)
- [Mapa dos requisitos funcionais](#mapa-dos-requisitos-funcionais)
- [Decisões técnicas](#decisões-técnicas)
- [Testes](#testes)
- [Créditos](#créditos)

---

## Como rodar

Pré-requisitos: **Node.js 20.19.4 ou mais recente** (verificado no 24.11) e um
destes para abrir o app:

- o aplicativo **Expo Go** (versão para o SDK 57) num celular Android ou iOS na
  mesma rede Wi-Fi do computador; ou
- um **emulador Android** (Android Studio) já aberto.

Instale as dependências:

```bash
npm install
```

Suba o servidor do Expo:

```bash
npx expo start
```

Depois, no terminal do Expo:

- **celular:** escaneie o QR Code — pelo Expo Go no Android, pela câmera no iOS;
- **emulador Android:** pressione `a`.

> **Versão do Expo Go.** O projeto usa o **Expo SDK 57**. No emulador Android,
> o `a` do `npx expo start` instala sozinho o Expo Go compatível. No celular, se
> o Expo Go da loja já tiver sido atualizado para um SDK mais novo, instale a
> versão do SDK 57 escolhendo-a em <https://expo.dev/go>.

Sem nenhuma configuração extra o app roda em **modo local**: as contas e a
coleção ficam salvas no próprio aparelho. Isso cobre integralmente os
requisitos obrigatórios RF06 e RF07. Na primeira tela, toque em
**Criar uma conta**.

---

## Ativando o bônus (Supabase)

1. Crie um projeto gratuito em <https://supabase.com>.
2. No painel, abra **SQL Editor** e execute
   [`docs/supabase_schema.sql`](docs/supabase_schema.sql) — ele cria a tabela
   `collection_items` e as políticas de Row Level Security (cada usuário só lê
   e altera as próprias linhas).
3. Em **Authentication → Sign In / Providers → Email**, desligue
   *Confirm email* para que o cadastro entre direto (facilita a demonstração).
4. Copie `.env.example` para `.env` e preencha com a **Project URL** e a
   **publishable key** (*Project Settings → API*; nos painéis antigos ela se
   chama *anon public key*):

```bash
cp .env.example .env
```

5. Reinicie o Expo limpando o cache, para ele ler as variáveis novas:

```bash
npx expo start -c
```

Cadastro e login passam a usar o Supabase Auth, e a coleção sincroniza na nuvem.
As chaves **não ficam no repositório**: o `.env` está no `.gitignore`, e o código as lê como
`process.env.EXPO_PUBLIC_SUPABASE_URL` / `process.env.EXPO_PUBLIC_SUPABASE_KEY`
(`src/services/supabase.ts`). Sem elas, o cliente Supabase simplesmente não é
criado e o app opera 100% local — quem clonar o repositório consegue usar tudo
sem ter conta no Supabase.

---

## Arquitetura

```
App.tsx                      providers: SafeArea > Auth > Coleção > Navigation
src/
├── screens/                 uma tela por arquivo (só interface)
│   ├── LoginScreen / RegisterScreen / SplashScreen
│   ├── CatalogScreen        RF01 — grade com rolagem infinita
│   ├── DetailScreen         RF02/RF03/RF04/RF07 — detalhes, favoritar, nota
│   ├── SearchScreen         RF08 — busca com lista de resultados
│   ├── FavoritesScreen      RF05
│   └── WatchedScreen        RF07 — assistidas com as notas
├── components/              ShowCard, ShowRow, ShowImage, RatingStars,
│                            PrimaryButton, IconButton, TextField, StateViews,
│                            KeyboardAnchor
├── contexts/                AuthContext (sessão) e CollectionContext (coleção)
├── hooks/                   useFetch, useInfiniteShows, useShowSearch, useOpenDetail
├── services/                api (Axios), tvmaze, storage (AsyncStorage),
│   └── auth/                supabase, auth local e auth Supabase
├── navigation/              RootNavigator + tipos das rotas
├── models/                  tipos de Show e da coleção, merge local × nuvem
├── theme/                   paleta, espaçamentos, tamanho mínimo de toque
└── utils/                   stripHtml
```

As dependências seguem num só sentido: **telas → hooks/contexts → services →
models**. Nenhuma tela chama o Axios ou o AsyncStorage diretamente.

Navegação:

```
RootNavigator
├── sem sessão → AuthStack (native-stack): Login, Register
└── com sessão → AppStack  (native-stack)
                 ├── Tabs (bottom-tabs): Catálogo, Buscar, Favoritos, Assistidas
                 └── Detail  ← recebe { id, name } por route.params
```

---

## Mapa dos requisitos funcionais

| RF | O que é | Onde está |
|----|---------|-----------|
| RF01 | `FlatList` em grade (`numColumns`), `ShowCard` por props, `keyExtractor`, rolagem infinita (`onEndReached` + `onEndReachedThreshold`), pull-to-refresh (`refreshing` + `onRefresh`), placeholder sem imagem | `screens/CatalogScreen.tsx`, `hooks/useInfiniteShows.ts`, `components/ShowCard.tsx`, `components/ShowImage.tsx` |
| RF02 | Navegação com `native-stack`, só o `id` por `route.params`, título dinâmico com `navigation.setOptions` | `navigation/RootNavigator.tsx`, `hooks/useOpenDetail.ts`, `screens/DetailScreen.tsx` |
| RF03 | Segunda requisição Axios (`/shows/:id`), capa ampliada, sinopse sem HTML | `screens/DetailScreen.tsx`, `services/tvmaze.ts`, `utils/stripHtml.ts` |
| RF04 | Favoritar com Context API + hook `useFavorites()`; o ícone do card reflete o estado | `contexts/CollectionContext.tsx`, `components/ShowCard.tsx` |
| RF05 | Tela de Favoritos reativa, com `ListEmptyComponent` | `screens/FavoritesScreen.tsx` |
| RF06 | `AsyncStorage` carregado em `useEffect`, sem tela "zerada" enquanto carrega; nuvem como bônus | `services/storage.ts`, `contexts/CollectionContext.tsx`, `navigation/RootNavigator.tsx` |
| RF07 | Login obrigatório com navegação condicional, sessão persistida, logout, assistidas com nota de 1 a 5 | `contexts/AuthContext.tsx`, `services/auth/`, `screens/WatchedScreen.tsx`, `components/RatingStars.tsx` |
| RF08 | Busca com `TextInput` controlado mostrando uma **lista** de resultados, filtro por gênero e mensagem clara quando não acha nada | `screens/SearchScreen.tsx`, `hooks/useShowSearch.ts` |
| RF09 | `ActivityIndicator` (tela e rodapé da lista), erros com "Tentar novamente", estados explícitos `loading`/`error`/`success` | `hooks/useFetch.ts`, `components/StateViews.tsx`, `services/api.ts` |
| RF10 | `accessible`, `accessibilityLabel`, `accessibilityRole`, `accessibilityState`, contraste WCAG AA, fonte do sistema respeitada, alvos de 44×44 com `hitSlop` | `theme/colors.ts` e todos os componentes |

---

## Decisões técnicas

**Context API + hooks em vez de passar props pela navegação.**
O toque em "Favoritar" acontece na Tela de Detalhes, mas quem precisa mudar é o
card do catálogo, a Tela de Favoritos e a de Assistidas. Passar callbacks por
`route.params` não funciona (parâmetros de rota devem ser serializáveis) e
espalharia a regra por todas as telas. O `CollectionContext` guarda a coleção
uma vez só, e as telas consomem por hooks com nomes do domínio —
`useFavorites()` e `useWatched()` —, sem saber como os dados são salvos.

**A lista não renderiza à toa.**
O `ShowCard` é um `React.memo` que recebe `isFavorite` pronto por props: ao
favoritar uma série, só aquele card renderiza de novo, não os outros 239. O
`renderItem` fica num `useCallback`, o `keyExtractor` usa o `id` da série e o
hook descarta ids repetidos ao anexar páginas — assim a chave nunca colide. O
número de colunas acompanha a largura da tela (2 no celular, 3–4 em tablet), e
a `key` da `FlatList` remonta a lista quando isso muda, porque `numColumns` não
pode trocar com a lista montada.

**Rolagem infinita à prova de toques repetidos.**
O `onEndReached` pode disparar várias vezes seguidas. O `useInfiniteShows`
guarda a requisição em andamento numa `ref` (lida e escrita na hora, sem
esperar render) e ignora pedidos duplicados. A API do TVmaze responde
`404` depois da última página; o serviço traduz isso para "fim do catálogo", e o
rodapé avisa quantas séries foram carregadas. Se a próxima página falhar, os
itens já carregados continuam na tela e só o rodapé mostra o erro com
"Tentar novamente".

**`useFetch` com estados explícitos e cancelamento.**
O hook devolve uma união discriminada (`loading` | `error` | `success`), então
a tela não consegue ler `data` sem antes tratar o carregamento e o erro. Cada
requisição recebe um `AbortController`: sair da tela ou trocar de série
cancela a anterior, e uma resposta atrasada nunca sobrescreve a atual.

**Nada aparece "zerado" enquanto o disco carrega.**
A coleção é lida do `AsyncStorage` num `useEffect` e o `CollectionContext`
expõe `ready`. Até lá o `RootNavigator` mostra a splash — evita o erro clássico
de aparecer "Nenhum favorito ainda" por meio segundo antes de os favoritos
chegarem. Cada usuário tem a própria chave no disco, e o provider é recriado
(`key={user.id}`) a cada login, então a coleção de uma conta nunca vaza para
outra.

**Senha nunca em texto puro.**
No modo local, a senha é guardada como SHA-256 de um *salt* aleatório + senha
(`expo-crypto`), e a sessão fica no `expo-secure-store` (Keystore no Android,
Keychain no iOS). Login errado mostra uma mensagem genérica, que não revela se
o e-mail existe. O logout só limpa o estado do `AuthContext`: o `RootNavigator`
troca sozinho para a pilha de login — não existe `navigate('Login')` no código.

**Local-first com nuvem opcional.**
Toda alteração é gravada no aparelho **antes** de ir para o Supabase. Se a rede
falhar, a ação vale mesmo assim e um aviso discreto oferece sincronizar de novo.
Ao entrar, local e nuvem são reconciliados por *last-write-wins* no campo
`updatedAt`. O `CollectionContext` depende só da interface `CloudCollection`,
o que permite testar a sincronização com uma nuvem falsa, sem rede.

**Contorno de um bug do Android 16 (botão voltar).**
Testando no emulador (Android 16 + Gboard), o botão voltar do sistema parava de
funcionar no app inteiro depois de usar a busca. A causa é um bug ainda aberto
do `react-native-screens`
([#4720](https://github.com/software-mansion/react-native-screens/issues/4720)):
quando a tela do campo de texto sai da hierarquia, o teclado continua ligado a
esse campo removido e consome o "voltar". `blur()` e `Keyboard.dismiss()` não
resolvem. O contorno (`components/KeyboardAnchor.tsx`) é um campo invisível na
raiz do app: quando uma tela com campo usado perde o foco, o `TextField` foca e
desfoca esse campo, e o Android religa o teclado a uma view que ainda existe.

---

## Testes

```bash
npm run verify
```

Roda `tsc --noEmit`, `expo lint` e os testes do Jest (`jest-expo` +
Testing Library). **52 testes, todos passando**, sem nenhum aviso de tipo ou de
lint.

- `src/__tests__/appFlow.test.tsx` (10) — o app inteiro, com navegação,
  Contexts e armazenamento reais, trocando só a API: login obrigatório (RF07),
  rolagem infinita anexando a página seguinte (RF01), título dinâmico e
  sinopse sem HTML (RF02/RF03), favoritar refletindo no card e na Tela de
  Favoritos (RF04/RF05), nota de 1 a 5 (RF07), sessão e favoritos sobrevivendo
  a "fechar e reabrir" (RF06), busca em lista e busca vazia (RF08), erro de
  rede com "Tentar novamente" (RF09) e logout.
- `src/hooks/__tests__/useInfiniteShows.test.ts` (8) — páginas que se acumulam,
  `onEndReached` repetido pedindo a página uma vez só, ids repetidos, fim do
  catálogo, falha da página seguinte sem perder os itens, pull-to-refresh e erro
  na primeira página.
- `src/contexts/__tests__/CollectionContext.test.tsx` (9) — favoritos, notas,
  persistência por usuário e sincronização com uma nuvem falsa.
- `src/services/__tests__/tvmaze.test.ts` (9) — conversão do JSON da API
  (inclusive série sem imagem), 404 como última página, erro amigável, sinopse
  sem HTML, busca com e sem resultados.
- `src/services/auth/__tests__/localAuth.test.ts` (7) — cadastro, senha com
  hash, sessão restaurada, credenciais erradas.
- `src/models/__tests__/collection.test.ts` (5) — regras da coleção e o merge
  local × nuvem.
- `src/utils/__tests__/stripHtml.test.ts` (4) — limpeza do HTML das sinopses.

---

## Créditos

Dados e imagens das séries: [TVmaze.com](https://www.tvmaze.com), conforme a
[licença CC BY-SA da API](https://www.tvmaze.com/api#licensing). O crédito
também aparece no fim da Tela de Detalhes.
