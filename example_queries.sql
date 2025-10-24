-- Exemplos de Queries SQL para o banco de alertas

-- =====================================
-- CONSULTAS BÁSICAS
-- =====================================

-- Ver todos os alertas
SELECT * FROM alerts ORDER BY created_at DESC;

-- Ver últimos 10 alertas
SELECT * FROM alerts ORDER BY created_at DESC LIMIT 10;

-- Contar total de alertas
SELECT COUNT(*) as total FROM alerts;

-- =====================================
-- CONSULTAS POR TIPO
-- =====================================

-- Contar alertas por tipo
SELECT type, COUNT(*) as quantidade 
FROM alerts 
GROUP BY type 
ORDER BY quantidade DESC;

-- Ver apenas alertas CRITICAL
SELECT * FROM alerts 
WHERE type = 'CRITICAL' 
ORDER BY created_at DESC;

-- Ver apenas alertas WARNING
SELECT * FROM alerts 
WHERE type = 'WARNING' 
ORDER BY created_at DESC;

-- =====================================
-- CONSULTAS POR SISTEMA
-- =====================================

-- Contar alertas por sistema
SELECT system, COUNT(*) as quantidade 
FROM alerts 
GROUP BY system 
ORDER BY quantidade DESC;

-- Ver alertas de um sistema específico
SELECT * FROM alerts 
WHERE system = 'Sistema de Pagamentos' 
ORDER BY created_at DESC;

-- =====================================
-- CONSULTAS POR PERÍODO
-- =====================================

-- Alertas de hoje
SELECT * FROM alerts 
WHERE DATE(created_at) = DATE('now') 
ORDER BY created_at DESC;

-- Alertas da última hora
SELECT * FROM alerts 
WHERE created_at >= datetime('now', '-1 hour') 
ORDER BY created_at DESC;

-- Alertas das últimas 24 horas
SELECT * FROM alerts 
WHERE created_at >= datetime('now', '-24 hours') 
ORDER BY created_at DESC;

-- Contar alertas por dia
SELECT DATE(created_at) as dia, COUNT(*) as quantidade 
FROM alerts 
GROUP BY DATE(created_at) 
ORDER BY dia DESC;

-- =====================================
-- CONSULTAS AGREGADAS
-- =====================================

-- Resumo geral: quantidade por tipo e sistema
SELECT type, system, COUNT(*) as quantidade 
FROM alerts 
GROUP BY type, system 
ORDER BY quantidade DESC;

-- Top 5 sistemas com mais alertas
SELECT system, COUNT(*) as quantidade 
FROM alerts 
GROUP BY system 
ORDER BY quantidade DESC 
LIMIT 5;

-- Top 5 hostnames com mais alertas
SELECT hostname, COUNT(*) as quantidade 
FROM alerts 
GROUP BY hostname 
ORDER BY quantidade DESC 
LIMIT 5;

-- =====================================
-- CONSULTAS POR AMBIENTE
-- =====================================

-- Alertas por ambiente
SELECT environment, COUNT(*) as quantidade 
FROM alerts 
GROUP BY environment 
ORDER BY quantidade DESC;

-- Alertas críticos em produção
SELECT * FROM alerts 
WHERE type = 'CRITICAL' 
  AND environment = 'production' 
ORDER BY created_at DESC;

-- =====================================
-- CONSULTAS AVANÇADAS
-- =====================================

-- Tempo médio entre alertas (em minutos)
SELECT 
    ROUND(AVG(
        (julianday(next_timestamp) - julianday(timestamp)) * 24 * 60
    ), 2) as tempo_medio_minutos
FROM (
    SELECT 
        timestamp,
        LEAD(timestamp) OVER (ORDER BY timestamp) as next_timestamp
    FROM alerts
)
WHERE next_timestamp IS NOT NULL;

-- Alertas duplicados (mesmo sistema e mensagem em menos de 1 minuto)
SELECT a1.id, a1.system, a1.message, a1.timestamp, a2.timestamp as duplicado_em
FROM alerts a1
INNER JOIN alerts a2 ON 
    a1.system = a2.system 
    AND a1.message = a2.message 
    AND a1.id < a2.id
    AND (julianday(a2.timestamp) - julianday(a1.timestamp)) * 24 * 60 < 1
ORDER BY a1.timestamp DESC;

-- Distribuição de alertas por hora do dia
SELECT 
    strftime('%H', timestamp) as hora,
    COUNT(*) as quantidade
FROM alerts
GROUP BY strftime('%H', timestamp)
ORDER BY hora;

-- =====================================
-- CONSULTAS DE MANUTENÇÃO
-- =====================================

-- Ver estrutura da tabela
PRAGMA table_info(alerts);

-- Ver índices da tabela
PRAGMA index_list(alerts);

-- Tamanho do banco de dados
SELECT 
    page_count * page_size / 1024.0 / 1024.0 as tamanho_mb
FROM pragma_page_count(), pragma_page_size();

-- =====================================
-- LIMPEZA DE DADOS
-- =====================================

-- Remover alertas com mais de 30 dias (use com cuidado!)
-- DELETE FROM alerts WHERE created_at < datetime('now', '-30 days');

-- Remover alertas de teste (use com cuidado!)
-- DELETE FROM alerts WHERE environment = 'test';

-- =====================================
-- COMO EXECUTAR ESTAS QUERIES
-- =====================================

-- Método 1: Via Docker
-- docker exec -it subscriber sqlite3 /app/data/alerts.db < example_queries.sql

-- Método 2: Interativo via Docker
-- docker exec -it subscriber sqlite3 /app/data/alerts.db
-- Depois copie e cole as queries desejadas

-- Método 3: Via script auxiliar
-- ./scripts.sh query
-- Depois copie e cole as queries desejadas

-- Método 4: No host (se tiver SQLite instalado)
-- sqlite3 data/subscriber/alerts.db < example_queries.sql
