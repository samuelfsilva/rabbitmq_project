const amqp = require('amqplib');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672';
const QUEUE_NAME = process.env.QUEUE_NAME || 'alertas';
const DB_PATH = process.env.DB_PATH || './data/alerts.db';

// Inicializar banco de dados SQLite
function initDatabase() {
  const dbDir = path.dirname(DB_PATH);
  
  // Criar diretório se não existir
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  
  // Criar tabela se não existir
  db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      system TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      hostname TEXT,
      environment TEXT,
      received_at TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Banco de dados SQLite inicializado');
  console.log(`📁 Localização: ${DB_PATH}\n`);

  return db;
}

// Função para salvar alerta no banco de dados
function saveAlert(db, alert) {
  try {
    const stmt = db.prepare(`
      INSERT INTO alerts (id, type, system, message, timestamp, hostname, environment, received_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      alert.id,
      alert.type,
      alert.system,
      alert.message,
      alert.timestamp,
      alert.metadata?.hostname || 'unknown',
      alert.metadata?.environment || 'unknown',
      new Date().toISOString()
    );

    return true;
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      console.log(`⚠️  Alerta ${alert.id} já existe no banco de dados`);
      return false;
    }
    throw error;
  }
}

// Função para exibir estatísticas
function showStats(db) {
  const stats = db.prepare(`
    SELECT 
      type,
      COUNT(*) as count
    FROM alerts
    GROUP BY type
    ORDER BY count DESC
  `).all();

  const total = db.prepare('SELECT COUNT(*) as total FROM alerts').get();

  console.log('\n📊 ESTATÍSTICAS DO BANCO DE DADOS');
  console.log('==========================================');
  console.log(`Total de alertas: ${total.total}`);
  console.log('');
  console.log('Por tipo:');
  stats.forEach(stat => {
    const icon = {
      'CRITICAL': '🔴',
      'WARNING': '🟡',
      'INFO': '🔵',
      'ERROR': '🟠'
    }[stat.type] || '⚪';
    console.log(`  ${icon} ${stat.type}: ${stat.count}`);
  });
  console.log('==========================================\n');
}

// Função principal para consumir mensagens
async function startSubscriber() {
  const db = initDatabase();
  let connection;
  let channel;

  try {
    console.log('🔌 Conectando ao RabbitMQ...');
    console.log(`URL: ${RABBITMQ_URL}`);
    
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    
    await channel.assertQueue(QUEUE_NAME, {
      durable: true
    });

    // Configurar prefetch para processar uma mensagem por vez
    channel.prefetch(1);

    console.log('✅ Conectado ao RabbitMQ com sucesso!');
    console.log(`📮 Fila: ${QUEUE_NAME}`);
    console.log('');
    console.log('==========================================');
    console.log('     SUBSCRIBER DE ALERTAS ATIVO');
    console.log('==========================================');
    console.log('Aguardando mensagens...');
    console.log('Pressione Ctrl+C para sair\n');

    // Exibir estatísticas iniciais
    showStats(db);

    let messageCount = 0;

    // Consumir mensagens
    channel.consume(QUEUE_NAME, (msg) => {
      if (msg !== null) {
        try {
          const alert = JSON.parse(msg.content.toString());
          messageCount++;

          const icon = {
            'CRITICAL': '🔴',
            'WARNING': '🟡',
            'INFO': '🔵',
            'ERROR': '🟠'
          }[alert.type] || '⚪';

          console.log(`\n${icon} NOVA MENSAGEM RECEBIDA (#${messageCount})`);
          console.log('------------------------------------------');
          console.log(`ID: ${alert.id}`);
          console.log(`Tipo: ${alert.type}`);
          console.log(`Sistema: ${alert.system}`);
          console.log(`Mensagem: ${alert.message}`);
          console.log(`Timestamp: ${alert.timestamp}`);
          console.log(`Hostname: ${alert.metadata?.hostname || 'N/A'}`);
          console.log(`Ambiente: ${alert.metadata?.environment || 'N/A'}`);

          // Salvar no banco de dados
          const saved = saveAlert(db, alert);
          if (saved) {
            console.log('💾 Salvo no banco de dados SQLite');
          }

          // Confirmar processamento da mensagem
          channel.ack(msg);
          console.log('✅ Mensagem processada com sucesso');

          // Exibir estatísticas a cada 5 mensagens
          if (messageCount % 5 === 0) {
            showStats(db);
          }

        } catch (error) {
          console.error('❌ Erro ao processar mensagem:', error.message);
          // Rejeitar mensagem e não reenviar para a fila
          channel.nack(msg, false, false);
        }
      }
    }, {
      noAck: false
    });

    // Tratamento de sinais para encerramento gracioso
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Encerrando subscriber...');
      showStats(db);
      await channel.close();
      await connection.close();
      db.close();
      console.log('✅ Subscriber encerrado com sucesso!');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Erro ao conectar ao RabbitMQ:', error.message);
    setTimeout(() => {
      console.log('🔄 Tentando reconectar em 5 segundos...');
      startSubscriber();
    }, 5000);
  }
}

// Iniciar o subscriber
console.log('🚀 Iniciando Subscriber...\n');
startSubscriber();
