/**
 * @author: Christoph Ersfeld, Senacor Technologies AG
 */

import * as messageTypes from './messageTypes';
import createConnectionManager from './createConnectionManager';
import winston from 'winston';


const createMessageHandler = () => {
  const messageHandler = {};
  const connectionManager = createConnectionManager(messageHandler);

  const parseMessage = (message) => {
    const messageObject = JSON.parse(message.utf8Data);
    winston.log('info', 'Received message', messageObject);

    return messageObject;
  };

  const sendMessage = (connection, messageType, messagePayload) => {
    if (connection) {
      const message = { type: messageType, payload: messagePayload };
      winston.log('info', 'Sending message', message);
      connection.sendUTF(JSON.stringify(message));
    }
  };

  messageHandler.sendSessionCreated = (connection, sessionId) => {
    sendMessage(connection, messageTypes.SESSION_CREATED, { sessionId });
  };

  messageHandler.sendAvailableSessions = (connection, availableSessions) => {
    sendMessage(connection, messageTypes.UPDATE_AVAILABLE_SESSIONS, availableSessions);
  };

  messageHandler.sendSessionUpdate = (connection, sessionState) => {
    sendMessage(connection, messageTypes.UPDATE_SESSION, sessionState);
  };

  messageHandler.sendStartSession = (connection) => {
    sendMessage(connection, messageTypes.START, {});
  };

  messageHandler.voteFinished = (connection, voteEvaluation) => {
    sendMessage(connection, messageTypes.VOTE_FINSHED, voteEvaluation);
  };

  messageHandler.updateVoteProgress = (connection, progress) => {
    sendMessage(connection, messageTypes.UPDATE_VOTE_PROGRESS, progress);
  };

  messageHandler.handleIncomingMessage = (connection, incomingMessage) => {
    const messageObject = parseMessage(incomingMessage);
    const { type, payload } = messageObject;
    switch (type) {
      case messageTypes.CREATE_SESSION:
        connectionManager.createSession(connection, payload.sessionName);
        break;
      case messageTypes.REQUEST_AVAILABLE_SESSIONS:
        connectionManager.requestAvailableSessions(connection);
        break;
      case messageTypes.CONNECT_TO_SESSION:
        connectionManager.connectToSession(connection, payload.id, payload.clientName);
        break;
      case messageTypes.START:
        connectionManager.startSession(connection);
        break;

      case messageTypes.VOTE:
        connectionManager.vote(connection, payload);
        break;
      default:
        break;
    }
  };

  messageHandler.addConnection = connectionManager.addConnection;
  messageHandler.handleConnectionClosed = connectionManager.closeConnection;

  return messageHandler;
};

export default createMessageHandler;
