# Limbus Web

Front-end em **Angular 21** que consome a [Limbus API](https://github.com/Kaicius/limbus-api) (Spring Boot). Lista, cria, edita e exclui Sinners, Tags, Identities, Stats, Sanity, Skills e Passivas, e tem uma tela de **Laboratório** que demonstra os recursos avançados da API (Parte 2).

> Projeto da disciplina de Spring Boot (Senac TSI) — Parte 2.

## Como executar

Requisitos: **Node.js 20.19+, 22.12+ ou 24** e a Limbus API rodando em `http://localhost:8080`.

```bash
npm install
npm start
```

Abra `http://localhost:4200`. Essa é a origem liberada no CORS da API (`app.cors.allowed-origins`); em outra porta o navegador bloqueia as chamadas.

O endereço da API fica em [`src/app/core/api.config.ts`](src/app/core/api.config.ts).

## Telas

| Rota | O que faz |
| :-- | :-- |
| `/identities` | Lista as Identities, com filtro por Sinner ou por Tag, e cria novas |
| `/identities/:id` | Ficha da Identity: edita/exclui a Identity e faz o CRUD de Stats, Sanity, Skills e Passivas |
| `/sinners` · `/tags` | CRUD com busca por nome |
| `/skills` · `/passives` | Listagens gerais com filtro (por Sin / por tipo) e exclusão |
| `/laboratorio` | Demonstra idempotência, rate limit, versionamento e CORS |

## Como o front usa os recursos da Parte 2

- **CORS:** o front (`:4200`) e a API (`:8080`) são origens diferentes; só funciona porque a API libera esta origem.
- **Idempotência:** cada formulário de criação gera um UUID ao abrir e o envia em `X-Idempotency-Key`. Reenviar o mesmo formulário (duplo clique, retry) não cria duplicado; a API responde com `Idempotent-Replayed: true` e o front avisa.
- **Versionamento:** o seletor **API v1 / API v2** na ficha da Identity troca o cabeçalho `X-API-Version`. Na v1 a ficha custa 5 requisições; na v2, o mesmo `GET /identities/{id}` devolve tudo em 1.
- **Rate limit:** o cabeçalho mostra as fichas restantes (`X-Rate-Limit-Remaining`). No `429`, mostra a contagem regressiva do `Retry-After`.

## Estrutura

```
src/app
├── core/                  serviços e tipos compartilhados
│   ├── api.config.ts          URL da API e nomes dos cabeçalhos
│   ├── api.interceptor.ts     roda em toda requisição: versão, rate limit e tradução de erros
│   ├── limbus-api.service.ts  todas as chamadas à API (único lugar com rotas)
│   ├── estado.service.ts      versão escolhida e estado do rate limit (signals)
│   ├── aviso.service.ts       avisos (toasts)
│   ├── confirmar.service.ts   caixa de confirmação
│   └── models.ts              tipos que espelham o JSON da API
├── shared/                modal e paginador
└── pages/                 uma pasta por tela
```

Componentes standalone, signals e o novo controle de fluxo (`@if` / `@for`), sem zone.js.
