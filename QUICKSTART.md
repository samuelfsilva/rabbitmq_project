# 🚀 Guia de Início Rápido

## ✅ Verificação de Pré-requisitos

Antes de iniciar, certifique-se de ter instalado:

```bash
# Verificar Docker
docker --version
# Saída esperada: Docker version 20.10.x ou superior

# Verificar Docker Compose
docker compose version
# Saída esperada: Docker Compose version v2.x.x ou superior
```

Se não tiver instalado, siga as instruções em: https://docs.docker.com/get-docker/

## 🎯 Início Rápido (30 segundos)

### Opção 1: Usando o script auxiliar

```bash
cd /home/ubuntu/rabbitmq_project
./scripts.sh start
```

### Opção 2: Usando Docker Compose diretamente

```bash
cd /home/ubuntu/rabbitmq_project
docker compose up -d --build
```

## 📊 Verificar Status

```bash
# Ver status dos containers
docker compose ps

# Ver logs em tempo real
docker compose logs -f

# Ver apenas logs do producer
docker compose logs -f producer

# Ver apenas logs do subscriber
docker compose logs -f subscriber
```

## 🌐 Acessar RabbitMQ Management UI

1. Abra seu navegador
2. Acesse: http://localhost:15672
3. Faça login:
   - **Usuário**: admin
   - **Senha**: admin123
4. Clique em "Queues" para ver a fila "alertas"

## 📈 Ver Estatísticas do Banco de Dados

```bash
./scripts.sh stats
```

Ou manualmente:

```bash
docker exec subscriber sqlite3 /app/data/alerts.db "SELECT type, COUNT(*) FROM alerts GROUP BY type;"
```

## 🛑 Parar o Sistema

```bash
# Opção 1: Script auxiliar
./scripts.sh stop

# Opção 2: Docker Compose
docker compose down
```

## 🧹 Limpar Dados

```bash
# Remove todos os dados e volumes
./scripts.sh clean

# Ou manualmente
docker compose down -v
rm -rf data/rabbitmq/* data/subscriber/*.db
```

## 📝 Comandos Úteis

```bash
# Reiniciar todos os serviços
./scripts.sh restart

# Ver logs
./scripts.sh logs

# Ver logs de um serviço específico
./scripts.sh logs producer
./scripts.sh logs subscriber

# Abrir prompt SQLite interativo
./scripts.sh query

# Ver estatísticas
./scripts.sh stats

# Ver ajuda
./scripts.sh help
```

## 🐛 Troubleshooting Comum

### Producer não conecta ao RabbitMQ

**Solução**: Aguarde alguns segundos para o RabbitMQ inicializar completamente.

```bash
docker compose logs rabbitmq | grep "Server startup complete"
```

### Porta 5672 ou 15672 já está em uso

**Solução**: Modifique as portas no `docker-compose.yml`:

```yaml
ports:
  - "5673:5672"     # Use porta diferente
  - "15673:15672"   # Use porta diferente
```

### Erro de permissão no banco SQLite

**Solução**:

```bash
chmod -R 777 data/subscriber/
```

## 🎓 Próximos Passos

1. ✅ Explore o RabbitMQ Management UI
2. ✅ Consulte o banco de dados SQLite
3. ✅ Modifique o intervalo de envio do Producer
4. ✅ Experimente escalar os serviços:
   ```bash
   docker compose up -d --scale producer=3
   docker compose up -d --scale subscriber=2
   ```
5. ✅ Teste resiliência parando um serviço e observando reconexão automática

## 📚 Documentação Adicional

- **README.md** - Documentação completa do projeto
- **ARCHITECTURE.md** - Arquitetura técnica detalhada
- **example_queries.sql** - Exemplos de queries SQL
- **scripts.sh** - Script auxiliar com comandos úteis

## 🎉 Tudo Pronto!

Seu sistema de mensageria com RabbitMQ está funcionando! 🐰

Acesse http://localhost:15672 e observe as mensagens fluindo em tempo real! 📊
