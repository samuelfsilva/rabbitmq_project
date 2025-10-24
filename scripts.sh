#!/bin/bash

# Script de utilidades para o projeto RabbitMQ

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

function print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

function print_error() {
    echo -e "${RED}❌ $1${NC}"
}

function print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

function start() {
    print_header "Iniciando o projeto"
    docker-compose up -d --build
    print_success "Serviços iniciados com sucesso!"
    echo ""
    print_warning "Aguarde alguns segundos para o RabbitMQ inicializar completamente"
    echo ""
    echo "🌐 RabbitMQ Management UI: http://localhost:15672"
    echo "   Usuário: admin"
    echo "   Senha: admin123"
}

function stop() {
    print_header "Parando os serviços"
    docker-compose down
    print_success "Serviços parados com sucesso!"
}

function restart() {
    print_header "Reiniciando os serviços"
    docker-compose restart
    print_success "Serviços reiniciados com sucesso!"
}

function logs() {
    print_header "Visualizando logs"
    if [ -z "$1" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f "$1"
    fi
}

function status() {
    print_header "Status dos serviços"
    docker-compose ps
}

function clean() {
    print_header "Limpando dados e volumes"
    read -p "Tem certeza que deseja remover todos os dados? (s/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        docker-compose down -v
        rm -rf data/rabbitmq/* data/subscriber/*.db
        print_success "Dados removidos com sucesso!"
    else
        print_warning "Operação cancelada"
    fi
}

function stats() {
    print_header "Estatísticas do banco de dados"
    if [ -f "data/subscriber/alerts.db" ]; then
        docker exec subscriber sqlite3 /app/data/alerts.db << 'EOF'
.mode column
.headers on
SELECT '📊 ESTATÍSTICAS GERAIS' as '';
SELECT COUNT(*) as 'Total de Alertas' FROM alerts;
SELECT '' as '';
SELECT '📈 POR TIPO' as '';
SELECT type as 'Tipo', COUNT(*) as 'Quantidade' FROM alerts GROUP BY type ORDER BY COUNT(*) DESC;
SELECT '' as '';
SELECT '🕐 ÚLTIMOS 5 ALERTAS' as '';
SELECT id, type, system, substr(timestamp, 1, 19) as timestamp FROM alerts ORDER BY created_at DESC LIMIT 5;
EOF
    else
        print_error "Banco de dados não encontrado. Inicie o subscriber primeiro."
    fi
}

function query() {
    print_header "Executar query no banco de dados"
    if [ -f "data/subscriber/alerts.db" ]; then
        docker exec -it subscriber sqlite3 /app/data/alerts.db
    else
        print_error "Banco de dados não encontrado. Inicie o subscriber primeiro."
    fi
}

function help() {
    print_header "Comandos disponíveis"
    echo ""
    echo "  ./scripts.sh start       - Inicia todos os serviços"
    echo "  ./scripts.sh stop        - Para todos os serviços"
    echo "  ./scripts.sh restart     - Reinicia todos os serviços"
    echo "  ./scripts.sh logs [srv]  - Mostra logs (opcional: producer|subscriber|rabbitmq)"
    echo "  ./scripts.sh status      - Mostra status dos containers"
    echo "  ./scripts.sh clean       - Remove todos os dados e volumes"
    echo "  ./scripts.sh stats       - Mostra estatísticas do banco de dados"
    echo "  ./scripts.sh query       - Abre prompt SQLite interativo"
    echo "  ./scripts.sh help        - Mostra esta ajuda"
    echo ""
}

# Main
case "${1:-help}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        logs "$2"
        ;;
    status)
        status
        ;;
    clean)
        clean
        ;;
    stats)
        stats
        ;;
    query)
        query
        ;;
    help|*)
        help
        ;;
esac
