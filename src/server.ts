import { Client } from '@stomp/stompjs'
import Fastify from 'fastify'
import WebSocket from 'ws'

// Define a porta padrão
const APP_PORT = Number(process.env.APP_PORT) || 3001
const MQ_HOST = process.env.MQ_HOST || 'localhost'
const MQ_PORT = Number(process.env.PORT) || 61614

// Necessario para o pacote `ws` funcionar corretamente com o Node.js
Object.assign(global, { WebSocket })

const fastify = Fastify({ logger: true })

let isConnected = false // Estado da conexão

// Configuração do cliente STOMP para se conectar ao ActiveMQ
const client = new Client({
    brokerURL: `ws://${MQ_HOST}:${MQ_PORT}/stomp`,
    connectHeaders: {
        login: 'admin',
        passcode: 'admin',
    },
    heartbeatIncoming: 4000, // Espera "heartbeats" do broker a cada 4 segundos
    heartbeatOutgoing: 4000, // Envia "heartbeats" ao broker a cada 4 segundos
    reconnectDelay: 5000,
    debug: (str) => console.log(str),
})

// Atualizar o estado da conexão
client.onConnect = () => {
    console.log('Connected to ActiveMQ')
    isConnected = true
}

client.onStompError = (frame) => {
    console.error('Broker reported error: ' + frame.headers['message'])
    console.error('Additional details: ' + frame.body)
}

client.onWebSocketClose = () => {
    console.log('Connection closed')
    isConnected = false
}

client.activate()

// Endpoint para registrar uma venda
fastify.post('/sales', async (request, reply) => {
    const { productId, quantity } = request.body as { productId: string; quantity: number }

    // Verificar se a conexão STOMP está ativa
    if (!isConnected) {
        return reply.status(500).send({ error: 'STOMP connection not established' })
    }

    try {
        client.publish({
            destination: '/queue/sales',
            body: JSON.stringify({ productId, quantity }),
        })

        return { status: 'Sale registered successfully!' }
    } catch (error) {
        console.error('Error publishing message:', error)
        return reply.status(500).send({ error: 'Failed to publish message' })
    }
})

// Inicializar o servidor Fastify
const start = async () => {
    try {
        await fastify.listen({ port: Number(APP_PORT), host: '0.0.0.0' })
        console.log(`Sales service running on http://localhost:${APP_PORT}!`)
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}

start()
