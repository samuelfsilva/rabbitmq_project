const amqp = require("amqplib");

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://admin:admin123@localhost:5672";
const QUEUE_NAME = process.env.QUEUE_NAME || "alertas";

// Tipos de alertas disponíveis
const ALERT_TYPES = ["CRITICAL", "WARNING", "INFO", "ERROR"];

// Sistemas de origem
const SYSTEMS = [
  "Sistema de Pagamentos",
  "Sistema de Autenticação",
  "Sistema de Monitoramento",
  "Sistema de Backup",
  "Sistema de API Gateway",
];

// Função para gerar um alerta aleatório
function generateAlert() {
  const type = ALERT_TYPES[Math.floor(Math.random() * ALERT_TYPES.length)];
  const system = SYSTEMS[Math.floor(Math.random() * SYSTEMS.length)];

  const messages = {
    CRITICAL: [
      `Falha crítica detectada no ${system}`,
      `${system} não está respondendo`,
      `Sobrecarga de CPU no ${system}`,
    ],
    WARNING: [
      `Uso de memória elevado no ${system}`,
      `Latência aumentada no ${system}`,
      `Taxa de erro acima do normal no ${system}`,
    ],
    INFO: [
      `${system} reiniciado com sucesso`,
      `Atualização aplicada no ${system}`,
      `Backup concluído no ${system}`,
    ],
    ERROR: [
      `Erro ao processar requisição no ${system}`,
      `Falha de conexão com banco de dados no ${system}`,
      `Timeout ao acessar ${system}`,
    ],
  };

  const messagesList = messages[type];
  const message = messagesList[Math.floor(Math.random() * messagesList.length)];

  return {
    id: `ALERT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: type,
    system: system,
    message: message,
    timestamp: new Date().toISOString(),
    metadata: {
      hostname: `server-${Math.floor(Math.random() * 10) + 1}`,
      environment: "production",
    },
  };
}

// Função principal para conectar e enviar mensagens
async function startProducer() {
  let connection;
  let channel;

  try {
    console.log("🔌 Conectando ao RabbitMQ...");
    console.log(`URL: ${RABBITMQ_URL}`);

    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, {
      durable: true,
    });

    console.log("✅ Conectado ao RabbitMQ com sucesso!");
    console.log(`📮 Fila: ${QUEUE_NAME}`);
    console.log("");
    console.log("==========================================");
    console.log("     PRODUCER DE ALERTAS ATIVO");
    console.log("==========================================");
    console.log("Pressione Ctrl+C para sair");
    console.log("");

    // Enviar mensagem imediatamente ao iniciar
    sendAlert(channel);

    // Enviar uma mensagem a cada 5 segundos
    const intervalId = setInterval(() => {
      sendAlert(channel);
    }, 5000);

    // Tratamento de sinais para encerramento gracioso
    process.on("SIGINT", async () => {
      console.log("\n\n🛑 Encerrando producer...");
      clearInterval(intervalId);
      await channel.close();
      await connection.close();
      console.log("✅ Producer encerrado com sucesso!");
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ Erro ao conectar ao RabbitMQ:", error.message);
    setTimeout(() => {
      console.log("🔄 Tentando reconectar em 5 segundos...");
      startProducer();
    }, 5000);
  }
}

// Função para enviar um alerta
function sendAlert(channel) {
  try {
    const alert = generateAlert();
    const message = JSON.stringify(alert);

    channel.sendToQueue(QUEUE_NAME, Buffer.from(message), {
      persistent: true,
    });

    const icon = {
      CRITICAL: "🔴",
      WARNING: "🟡",
      INFO: "🔵",
      ERROR: "🟠",
    }[alert.type];

    console.log(`${icon} [${alert.timestamp}] ${alert.type} - ${alert.id}`);
    console.log(`   ${alert.message}`);
    console.log(`   Sistema: ${alert.system}`);
    console.log("");
  } catch (error) {
    console.error("❌ Erro ao enviar mensagem:", error.message);
  }
}

// Iniciar o producer
console.log("🚀 Iniciando Producer...\n");
startProducer();
