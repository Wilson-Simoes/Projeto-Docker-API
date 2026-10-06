# Projeto Docker: API Express + Prisma + PostgreSQL

Projeto de estudo **Testando aplicação Docker**. É uma API simples em **Node.js + TypeScript** que roda dentro de um container **Docker** e está preparada para se conectar a um banco **PostgreSQL** usando o **Prisma ORM**.

O objetivo é praticar o fluxo completo: escrever a aplicação, empacotá-la em uma imagem Docker, subir um banco em outro container e fazer os dois conversarem pela mesma rede.

## O que o projeto faz

- Sobe um servidor Express na porta `3000`.
- Expõe a rota `GET /projeto-docker`, que responde:

```json
{ "message": "Testando aplicação Docker" }
```

- Já inclui o Prisma configurado com um model `User` (`id`, `email`, `name`) e o client em `src/lib/prisma.ts`, pronto para ser usado nas rotas.

## Tecnologias

| Ferramenta | Uso |
| --- | --- |
| Node.js 24 | Ambiente de execução (imagem `node:24-slim`) |
| Express 5 | Servidor HTTP |
| TypeScript | Tipagem; executado em desenvolvimento com `tsx` |
| Prisma 7 + `@prisma/adapter-pg` | ORM e conexão com o PostgreSQL |
| PostgreSQL | Banco de dados (em um container separado) |
| Docker | Containerização da API e do banco |
| nodemon | Reinicia o servidor ao salvar arquivos |

## Estrutura do projeto

```
my-app/
├── prisma/
│   └── schema.prisma      # Models e configuração do banco
├── src/
│   ├── generated/prisma/  # Client gerado pelo Prisma (não vai para o Git)
│   ├── lib/
│   │   └── prisma.ts      # Instância do PrismaClient
│   └── server.ts          # Servidor Express e rotas
├── .dockerignore
├── .gitignore
├── Dockerfile
├── package.json
├── prisma.config.ts       # Configuração do Prisma CLI (lê o DATABASE_URL)
└── tsconfig.json
```

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) instalado e funcionando
- [Git](https://git-scm.com/)

Não é necessário ter Node.js instalado na máquina, pois tudo roda dentro do container.

## Como executar

### 1. Clonar o repositório

```bash
git clone https://github.com/Wilson-Simoes/NOME-DO-REPOSITORIO.git
cd NOME-DO-REPOSITORIO
```

### 2. Criar o arquivo `.env`

O `.env` não é versionado (está no `.gitignore`), então crie-o na raiz do projeto:

```env
DATABASE_URL="postgresql://postgres:1234@postgres:5432/postgres?schema=public"
```

Repare que o host da URL é `postgres`. Esse é o nome do container do banco, que será usado como endereço dentro da rede Docker.

### 3. Criar a rede e subir o PostgreSQL

Para os containers se encontrarem pelo nome, eles precisam estar na mesma rede:

```bash
docker network create app-net

docker run --name postgres --network app-net \
  -e POSTGRES_PASSWORD=1234 \
  -d postgres:17
```

A senha `1234` deve ser a mesma usada no `DATABASE_URL`.

### 4. Construir a imagem da API

```bash
docker build -t api .
```

### 5. Rodar o container da API

```bash
docker run --name api --network app-net -p 3000:3000 -v "$PWD":/app api
```

- `--network app-net` coloca a API na mesma rede do banco.
- `-p 3000:3000` publica a porta do container na sua máquina.
- `-v "$PWD":/app` espelha a pasta do projeto dentro do container, então as alterações no código aparecem na hora, sem rebuild.

Quando aparecer `Servidor rodando na porta 3000`, a API está no ar.

### 6. Gerar o client do Prisma e criar as tabelas

Com a API rodando, abra outro terminal e execute:

```bash
docker exec api npx prisma generate
docker exec api npx prisma migrate dev --name init
```

- `prisma generate` cria o client em `src/generated/prisma`. Esse passo é obrigatório depois de clonar, porque a pasta não é versionada.
- `prisma migrate dev` cria no PostgreSQL as tabelas definidas no `schema.prisma`.

### 7. Testar

Acesse no navegador ou use o `curl`:

```bash
curl http://localhost:3000/projeto-docker
```

Resposta esperada:

```json
{"message":"Testando aplicação Docker"}
```

## Como funciona

### Dockerfile

```dockerfile
FROM node:24-slim
RUN apt-get update -y && apt-get install -y openssl
WORKDIR /app
COPY . .
RUN npm install
VOLUME /app/node_modules
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

1. Parte de uma imagem Node.js 24 enxuta (`slim`).
2. Instala o `openssl`, que o Prisma precisa para funcionar nessa imagem.
3. Define `/app` como pasta de trabalho e copia o projeto para dentro.
4. Instala as dependências com `npm install`.
5. Declara `/app/node_modules` como volume. Assim, quando a pasta do projeto é espelhada com `-v "$PWD":/app`, os `node_modules` instalados na imagem não são sobrescritos pela pasta local.
6. Documenta a porta `3000` e inicia a aplicação em modo de desenvolvimento.

### Modo de desenvolvimento

O comando `npm run dev` usa o `nodemon` junto com o `tsx` para executar o TypeScript diretamente e reiniciar o servidor a cada alteração salva.

### Conexão com o banco

O `src/lib/prisma.ts` lê a variável `DATABASE_URL`, cria um adaptador `PrismaPg` e entrega um `PrismaClient` pronto para uso:

```ts
import { prisma } from "./lib/prisma";

const users = await prisma.user.findMany();
```

O `prisma.config.ts` faz o mesmo para o Prisma CLI (migrations e generate), carregando o `.env` com o `dotenv`.

## Scripts do `package.json`

| Script | O que faz |
| --- | --- |
| `npm run dev` | Inicia o servidor com recarga automática (usado no Docker) |
| `npm run build` | Compila o TypeScript com `tsc` |
| `npm start` | Executa a versão compilada (`dist/server.js`) |

## Comandos úteis do Docker

```bash
docker ps                    # lista os containers em execução
docker logs -f api           # acompanha os logs da API
docker stop api postgres     # para os containers
docker start postgres api    # inicia de novo, sem recriar
docker rm api postgres       # remove os containers
docker network rm app-net    # remove a rede
```

Se aparecer o erro `container name already in use`, remova o container antigo com `docker rm api` (ou `docker rm postgres`) antes de rodar o comando novamente.

## Autor

Feito por [Wilson Simões](https://github.com/Wilson-Simoes) - Curso Docker do Zero ao Avançado.
