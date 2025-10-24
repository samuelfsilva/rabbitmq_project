# 🏗️ Arquitetura do Sistema de Mensageria

## Visão Geral

Este documento descreve a arquitetura técnica do sistema de mensageria com RabbitMQ.

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                        DOCKER COMPOSE                           │
│                                                                 │
│  ┌────────────────┐      ┌─────────────────┐      ┌──────────┐│
│  │   Producer     │      │   RabbitMQ      │      │Subscriber││
│  │   Container    │      │   Container     │      │Container ││
│  │                │      │                 │      │          ││
│  │  ┌──────────┐  │      │  ┌───────────┐  │      │ ┌──────┐││
│  │  │ Node.js  │  │      │  │  Broker   │  │      │ │Node.js│││
│  │  │          │  │────▶ │  │           │  │────▶ │ │      │││
│  │  │ Producer │  │ AMQP │  │   Queue   │  │ AMQP │ │Sub-  │││
│  │  │  Logic   │  │      │  │  "alertas"│  │      │ │scriber│││
│  │  └──────────┘  │      │  └───────────┘  │      │ └──────┘││
│  │                │      │                 │      │     │    ││
│  │  amqplib       │      │  Management UI  │      │     ▼    ││
│  │                │      │  (Port 15672)   │      │ ┌──────┐││
│  └────────────────┘      └─────────────────┘      │ │SQLite│││
│         │                        │                │ │  DB  │││
│         │                        │                │ └──────┘││
│         │                        │                └──────────┘│
│         │                        │                     │      │
│         ▼                        ▼                     ▼      │
│    Port 5672               Port 5672            Volume Mount │
│                           Port 15672                          │
└─────────────────────────────────────────────────────────────────┘
         │                        │                     │
         ▼                        ▼                     ▼
    Host Network            Browser Access         Host Filesystem
   (localhost:5672)      (localhost:15672)     (./data/subscriber/)
```

## Componentes Detalhados

### 1. Producer Container

**Responsabilidades:**
- Gerar mensagens de alerta aleatórias
- Conectar ao RabbitMQ via AMQP
- Enviar mensagens para a fila "alertas"
- Garantir persistência das mensagens

**Tecnologias:**
- Node.js 18 Alpine
- amqplib (cliente AMQP)

**Características:**
- Envia mensagens a cada 5 segundos
- Reconexão automática em caso de falha
- Mensagens persistentes (durable)
- Logs coloridos e detalhados

**Variáveis de Ambiente:**
```
RABBITMQ_URL=amqp://admin:admin123@rabbitmq:5672
QUEUE_NAME=alertas
```

### 2. RabbitMQ Container

**Responsabilidades:**
- Broker de mensagens AMQP
- Gerenciamento de filas
- Interface web de administração
- Persistência de mensagens

**Tecnologias:**
- RabbitMQ 3.12 Management Alpine
- Erlang runtime
- Management Plugin

**Portas Expostas:**
- `5672`: AMQP protocol
- `15672`: Management UI (HTTP)

**Características:**
- Fila durável (sobrevive a reinicializações)
- Mensagens persistentes
- Health checks configurados
- Volume para persistência de dados

**Credenciais Padrão:**
```
Usuário: admin
Senha: admin123
```

### 3. Subscriber Container

**Responsabilidades:**
- Consumir mensagens da fila RabbitMQ
- Processar e validar mensagens
- Persistir no banco SQLite
- Exibir logs no console

**Tecnologias:**
- Node.js 18 Alpine
- amqplib (cliente AMQP)
- better-sqlite3 (banco de dados)

**Características:**
- Processamento one-at-a-time (prefetch=1)
- ACK/NACK para garantir processamento
- Banco SQLite persistente via volume
- Estatísticas automáticas a cada 5 mensagens
- Reconexão automática em caso de falha

**Variáveis de Ambiente:**
```
RABBITMQ_URL=amqp://admin:admin123@rabbitmq:5672
QUEUE_NAME=alertas
DB_PATH=/app/data/alerts.db
```

## Fluxo de Dados

### 1. Produção de Mensagens

```
┌──────────┐
│ Producer │
└────┬─────┘
     │ 1. Gera alerta
     │    {id, type, system, message, timestamp, metadata}
     │
     │ 2. Serializa para JSON
     │    JSON.stringify(alert)
     │
     │ 3. Envia para RabbitMQ
     │    channel.sendToQueue(QUEUE_NAME, buffer, {persistent: true})
     │
     ▼
┌──────────────┐
│   RabbitMQ   │
│ Queue:alertas│
└──────────────┘
```

### 2. Consumo de Mensagens

```
┌──────────────┐
│   RabbitMQ   │
│ Queue:alertas│
└────┬─────────┘
     │ 1. Entrega mensagem
     │    channel.consume(QUEUE_NAME, callback)
     │
     ▼
┌────────────┐
│ Subscriber │
└────┬───────┘
     │ 2. Desserializa
     │    JSON.parse(msg.content)
     │
     │ 3. Valida dados
     │
     │ 4. Salva no SQLite
     │    INSERT INTO alerts (...)
     │
     │ 5. Exibe no console
     │    console.log(...)
     │
     │ 6. Confirma processamento
     │    channel.ack(msg)
     │
     ▼
┌──────────┐
│ SQLite DB│
└──────────┘
```

## Modelo de Dados

### Mensagem de Alerta (JSON)

```json
{
  "id": "ALERT-1729612345678-123",
  "type": "CRITICAL | WARNING | INFO | ERROR",
  "system": "Sistema de Pagamentos",
  "message": "Descrição do alerta",
  "timestamp": "2025-10-22T10:30:45.678Z",
  "metadata": {
    "hostname": "server-5",
    "environment": "production"
  }
}
```

### Tabela SQLite: `alerts`

```sql
CREATE TABLE alerts (
  id TEXT PRIMARY KEY,              -- ID único do alerta
  type TEXT NOT NULL,               -- Tipo do alerta
  system TEXT NOT NULL,             -- Sistema de origem
  message TEXT NOT NULL,            -- Mensagem do alerta
  timestamp TEXT NOT NULL,          -- Timestamp do alerta
  hostname TEXT,                    -- Hostname do servidor
  environment TEXT,                 -- Ambiente (production, etc)
  received_at TEXT NOT NULL,        -- Quando foi recebido
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- Criação no DB
);
```

## Padrões de Comunicação

### AMQP Protocol

- **Protocolo**: AMQP 0-9-1
- **Exchange**: Default (direct)
- **Routing Key**: Nome da fila
- **Delivery Mode**: Persistent (2)
- **Acknowledgment**: Manual (ACK/NACK)

### Garantias de Entrega

1. **Durabilidade da Fila**: `durable: true`
   - Fila sobrevive a reinicializações do RabbitMQ

2. **Persistência da Mensagem**: `persistent: true`
   - Mensagens são salvas em disco

3. **Acknowledgment Manual**: `noAck: false`
   - Subscriber confirma processamento explicitamente
   - Permite reprocessamento em caso de falha

4. **Prefetch Count**: `1`
   - Subscriber processa uma mensagem por vez
   - Evita sobrecarga

## Resiliência e Recuperação

### Producer

- **Reconexão Automática**: Retry em caso de falha de conexão
- **Intervalo de Retry**: 5 segundos
- **Graceful Shutdown**: SIGINT handler para encerramento limpo

### Subscriber

- **Reconexão Automática**: Retry em caso de falha de conexão
- **Intervalo de Retry**: 5 segundos
- **Tratamento de Erros**: NACK em caso de falha de processamento
- **Graceful Shutdown**: SIGINT handler para encerramento limpo

### RabbitMQ

- **Health Checks**: Verificação de saúde a cada 10 segundos
- **Volumes**: Dados persistidos em `./data/rabbitmq/`
- **Restart Policy**: Automática via Docker

## Escalabilidade

### Horizontal Scaling

**Producer:**
```bash
docker-compose up -d --scale producer=3
```
- Múltiplos producers podem enviar para a mesma fila
- Aumenta throughput de mensagens

**Subscriber:**
```bash
docker-compose up -d --scale subscriber=3
```
- Múltiplos subscribers consomem da mesma fila
- Load balancing automático pelo RabbitMQ
- Cada mensagem é entregue para apenas um subscriber

### Vertical Scaling

- Ajustar recursos de CPU/memória no Docker Compose
- Configurar prefetch count baseado em capacidade

## Monitoramento

### Logs

```bash
# Producer logs
docker-compose logs -f producer

# Subscriber logs
docker-compose logs -f subscriber

# RabbitMQ logs
docker-compose logs -f rabbitmq
```

### Management UI

**URL**: http://localhost:15672

**Métricas Disponíveis:**
- Taxa de mensagens (msg/s)
- Mensagens na fila
- Consumers conectados
- Uso de memória
- Uptime

### Database Statistics

```bash
./scripts.sh stats
```

**Métricas:**
- Total de alertas
- Distribuição por tipo
- Últimos alertas recebidos

## Segurança

### Credenciais

⚠️ **Desenvolvimento**: Credenciais hardcoded no `docker-compose.yml`

🔐 **Produção**: Use variáveis de ambiente e secrets

```bash
# .env file
RABBITMQ_DEFAULT_USER=secure_user
RABBITMQ_DEFAULT_PASS=super_secret_password_123!@#
```

### Network Isolation

- Rede Docker bridge isolada (`rabbitmq_network`)
- Apenas portas necessárias expostas ao host
- Containers se comunicam via hostnames internos

### Data Persistence

- Volume mount para RabbitMQ: `./data/rabbitmq/`
- Volume mount para SQLite: `./data/subscriber/`
- Dados sobrevivem a reinicializações

## Performance

### Throughput Esperado

- **Producer**: ~200 msg/s (single instance)
- **RabbitMQ**: ~10,000 msg/s (configuração padrão)
- **Subscriber**: ~100 msg/s (single instance, com I/O SQLite)

### Otimizações Possíveis

1. **Batch Processing**: Processar múltiplas mensagens por vez
2. **Connection Pooling**: Reusar conexões AMQP
3. **In-Memory Database**: SQLite `:memory:` para testes
4. **Prefetch Tuning**: Ajustar baseado em latência

## Troubleshooting

### Producer não conecta

✅ **Verificar**: RabbitMQ está rodando?
```bash
docker-compose ps rabbitmq
```

✅ **Verificar**: Health check passou?
```bash
docker-compose logs rabbitmq | grep "Server startup complete"
```

### Mensagens não são consumidas

✅ **Verificar**: Subscriber está rodando?
```bash
docker-compose ps subscriber
```

✅ **Verificar**: Mensagens na fila?
- Acessar Management UI
- Verificar "Queues" → "alertas"

### Banco de dados corrompido

✅ **Solução**:
```bash
./scripts.sh clean
docker-compose up -d
```

## Referências

- [RabbitMQ Official Docs](https://www.rabbitmq.com/documentation.html)
- [AMQP 0-9-1 Protocol](https://www.rabbitmq.com/tutorials/amqp-concepts.html)
- [amqplib Documentation](http://www.squaremobius.net/amqp.node/)
- [Better SQLite3](https://github.com/WiseLibs/better-sqlite3)
