# 🐰 Sistema de Mensageria com RabbitMQ

Sistema completo de mensageria usando RabbitMQ, Node.js e Docker Compose para gerenciamento de alertas em tempo real.

## 📋 Descrição do Projeto

Este projeto implementa uma arquitetura de mensageria usando o padrão **Producer-Consumer** com RabbitMQ. O sistema é composto por:

- **Producer**: Gera e envia mensagens de alerta para uma fila RabbitMQ
- **Subscriber (Consumer)**: Consome mensagens da fila, salva no banco SQLite e exibe no console
- **RabbitMQ**: Broker de mensagens com interface de gerenciamento web
- **SQLite**: Banco de dados para persistência dos alertas

## 🏗️ Arquitetura

```
┌─────────────┐         ┌─────────────┐         ┌──────────────┐
│   Producer  │ ──────> │  RabbitMQ   │ ──────> │  Subscriber  │
│  (Node.js)  │         │   (Queue)   │         │  (Node.js)   │
└─────────────┘         └─────────────┘         └──────────────┘
                              │                        │
                              │                        │
                              v                        v
                        Management UI             SQLite DB
                        (Port 15672)          (alerts.db)
```

## 🚀 Tecnologias Utilizadas

- **Node.js** v18
- **RabbitMQ** 3.12 (com Management Plugin)
- **Docker** & **Docker Compose**
- **SQLite** (via better-sqlite3)
- **amqplib** - Cliente AMQP para Node.js

## 📁 Estrutura do Projeto

```
rabbitmq_project/
├── docker-compose.yml          # Orquestração dos serviços
├── producer/
│   ├── Dockerfile
│   ├── index.js                # Código do Producer
│   ├── package.json
│   └── yarn.lock
├── subscriber/
│   ├── Dockerfile
│   ├── index.js                # Código do Subscriber
│   ├── package.json
│   └── yarn.lock
├── data/
│   ├── rabbitmq/               # Dados persistentes do RabbitMQ
│   └── subscriber/
│       └── alerts.db           # Banco de dados SQLite
└── README.md
```

## 🔧 Pré-requisitos

- Docker (versão 20.10 ou superior)
- Docker Compose (versão 1.29 ou superior)

## 🎯 Como Executar

### 1. Iniciar todos os serviços

No diretório raiz do projeto (`/home/ubuntu/rabbitmq_project`), execute:

```bash
docker-compose up --build
```

Este comando irá:
- ✅ Baixar as imagens necessárias
- ✅ Construir as imagens do Producer e Subscriber
- ✅ Iniciar o RabbitMQ com Management UI
- ✅ Iniciar o Producer (enviando mensagens automaticamente)
- ✅ Iniciar o Subscriber (consumindo mensagens)

### 2. Executar em modo background (detached)

```bash
docker-compose up -d --build
```

### 3. Ver logs em tempo real

```bash
# Todos os serviços
docker-compose logs -f

# Apenas Producer
docker-compose logs -f producer

# Apenas Subscriber
docker-compose logs -f subscriber

# Apenas RabbitMQ
docker-compose logs -f rabbitmq
```

### 4. Parar os serviços

```bash
docker-compose down
```

### 5. Parar e remover volumes (limpar dados)

```bash
docker-compose down -v
```

## 🌐 Acessar RabbitMQ Management UI

Após iniciar os serviços, acesse a interface web do RabbitMQ:

- **URL**: http://localhost:15672
- **Usuário**: `admin`
- **Senha**: `admin123`

Na interface você poderá:
- 📊 Visualizar estatísticas da fila
- 📈 Monitorar taxa de mensagens (incoming/outgoing)
- 🔍 Inspecionar mensagens na fila
- ⚙️ Configurar exchanges e bindings
- 👥 Gerenciar usuários e permissões

## 📤 Producer - Enviando Mensagens

O Producer envia mensagens automaticamente a cada **5 segundos**.

### Tipos de Alertas Gerados

- 🔴 **CRITICAL**: Falhas críticas no sistema
- 🟡 **WARNING**: Avisos de uso elevado de recursos
- 🔵 **INFO**: Informações gerais do sistema
- 🟠 **ERROR**: Erros operacionais

### Exemplo de Mensagem

```json
{
  "id": "ALERT-1729612345678-123",
  "type": "CRITICAL",
  "system": "Sistema de Pagamentos",
  "message": "Falha crítica detectada no Sistema de Pagamentos",
  "timestamp": "2025-10-22T10:30:45.678Z",
  "metadata": {
    "hostname": "server-5",
    "environment": "production"
  }
}
```

### Personalizar Intervalo de Envio

Edite o arquivo `producer/index.js` e modifique a linha:

```javascript
// Altere 5000 (5 segundos) para o valor desejado em milissegundos
const intervalId = setInterval(() => {
  sendAlert(channel);
}, 5000); // <-- Modifique aqui
```

## 📥 Subscriber - Consumindo Mensagens

O Subscriber:
1. ✅ Conecta ao RabbitMQ
2. ✅ Consome mensagens da fila `alertas`
3. ✅ Salva cada alerta no banco SQLite
4. ✅ Exibe informações no console
5. ✅ Mostra estatísticas a cada 5 mensagens

### Banco de Dados SQLite

O banco de dados é criado automaticamente em:
```
/home/ubuntu/rabbitmq_project/data/subscriber/alerts.db
```

#### Estrutura da Tabela `alerts`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | TEXT | ID único do alerta (PRIMARY KEY) |
| type | TEXT | Tipo do alerta (CRITICAL, WARNING, INFO, ERROR) |
| system | TEXT | Sistema de origem |
| message | TEXT | Mensagem do alerta |
| timestamp | TEXT | Timestamp do alerta |
| hostname | TEXT | Hostname do servidor |
| environment | TEXT | Ambiente (production, staging, etc) |
| received_at | TEXT | Data/hora em que foi recebido |
| created_at | DATETIME | Data/hora de inserção no banco |

### Consultar o Banco de Dados

Você pode consultar o banco usando SQLite CLI:

```bash
# Entrar no container do subscriber
docker exec -it subscriber sh

# Instalar sqlite3 (se necessário)
apk add sqlite

# Acessar o banco
sqlite3 /app/data/alerts.db

# Executar consultas
SELECT * FROM alerts ORDER BY created_at DESC LIMIT 10;
SELECT type, COUNT(*) as count FROM alerts GROUP BY type;
```

Ou diretamente do host:

```bash
# Instalar sqlite3 no host
sudo apt-get install sqlite3

# Consultar
sqlite3 /home/ubuntu/rabbitmq_project/data/subscriber/alerts.db "SELECT * FROM alerts LIMIT 10;"
```

## 🔄 Comandos Úteis

### Reiniciar um serviço específico

```bash
docker-compose restart producer
docker-compose restart subscriber
docker-compose restart rabbitmq
```

### Reconstruir e reiniciar um serviço

```bash
docker-compose up -d --build producer
docker-compose up -d --build subscriber
```

### Ver status dos containers

```bash
docker-compose ps
```

### Executar comandos dentro dos containers

```bash
# Producer
docker exec -it producer sh

# Subscriber
docker exec -it subscriber sh

# RabbitMQ
docker exec -it rabbitmq sh
```

## 🐛 Troubleshooting

### Problema: Producer não conecta ao RabbitMQ

**Solução**: Aguarde alguns segundos para o RabbitMQ inicializar completamente. O Producer tem retry automático.

### Problema: Subscriber não recebe mensagens

**Verificações**:
1. ✅ RabbitMQ está rodando? `docker-compose ps`
2. ✅ Producer está enviando? `docker-compose logs producer`
3. ✅ Fila existe? Verifique no Management UI (http://localhost:15672)

### Problema: Erro de permissão no banco SQLite

**Solução**: 
```bash
chmod -R 777 /home/ubuntu/rabbitmq_project/data/subscriber/
```

### Problema: Porta 5672 ou 15672 já está em uso

**Solução**: Modifique as portas no `docker-compose.yml`:
```yaml
ports:
  - "5673:5672"     # Altere 5672 para outra porta
  - "15673:15672"   # Altere 15672 para outra porta
```

## 📊 Monitoramento e Estatísticas

### Via RabbitMQ Management UI
- Acesse http://localhost:15672
- Navegue até "Queues"
- Clique na fila "alertas"
- Visualize:
  - Taxa de mensagens/segundo
  - Mensagens na fila
  - Consumers conectados

### Via Subscriber Logs
O Subscriber exibe estatísticas automáticas a cada 5 mensagens processadas:

```
📊 ESTATÍSTICAS DO BANCO DE DADOS
==========================================
Total de alertas: 25

Por tipo:
  🟡 WARNING: 8
  🔴 CRITICAL: 7
  🔵 INFO: 6
  🟠 ERROR: 4
==========================================
```

## 🔐 Segurança

### Credenciais Padrão

⚠️ **ATENÇÃO**: As credenciais padrão são apenas para desenvolvimento!

Para produção, altere:

```yaml
# docker-compose.yml
environment:
  RABBITMQ_DEFAULT_USER: seu_usuario
  RABBITMQ_DEFAULT_PASS: sua_senha_forte
```

E atualize as URLs de conexão no Producer e Subscriber.

## 🎓 Conceitos Aprendidos

- ✅ Arquitetura de mensageria assíncrona
- ✅ Padrão Producer-Consumer
- ✅ Filas duráveis e mensagens persistentes
- ✅ Acknowledgment de mensagens (ACK/NACK)
- ✅ Prefetch e controle de fluxo
- ✅ Docker multi-container
- ✅ Persistência de dados com volumes Docker
- ✅ Health checks em serviços

## 📚 Recursos Adicionais

- [Documentação oficial do RabbitMQ](https://www.rabbitmq.com/documentation.html)
- [Tutorial de RabbitMQ com Node.js](https://www.rabbitmq.com/tutorials/tutorial-one-javascript.html)
- [amqplib no GitHub](https://github.com/amqp-node/amqplib)
- [Better SQLite3](https://github.com/WiseLibs/better-sqlite3)

## 📝 Licença

MIT

## 👨‍💻 Autor

Projeto criado para demonstração de sistema de mensageria com RabbitMQ.

---

**Desenvolvido com ❤️ usando RabbitMQ, Node.js e Docker**
