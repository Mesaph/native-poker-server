import http from 'http';
import { server as WebSocketServer } from 'websocket';
import configuration from './configuration';
import winston from 'winston';

import createMessageHandler from './createMessageHandler';

const server = http.createServer((request, response) => {});

server.listen(configuration.port, () => {
  winston.log('info', `Server is listening on port ${configuration.port}`);
});

const wsServer = new WebSocketServer({
  httpServer: server,
  autoAcceptConnections: false,
});

const originIsAllowed = () => true;


const messageHandler = createMessageHandler();

wsServer.on('request', (request) => {
  if (!originIsAllowed(request.origin)) {
    request.reject();
    return;
  }

  const connection = request.accept(configuration.wsProtocol, request.origin);
  winston.log('info', 'Connection established ');

  messageHandler.addConnection(connection);

  connection.on('message', (message) => {
    messageHandler.handleIncomingMessage(connection, message);
  });
  connection.on('close', () => {
    messageHandler.handleConnectionClosed(connection);
  });
});
