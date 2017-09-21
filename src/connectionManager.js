import winston from 'winston';
import createSessionManager from './sessionManager';

const broadcastToSession = (session, sendMessage, excludeSessionHost) => {
  if (!session || !sendMessage) {
    return;
  }
  const sessionConnections = session.clients.map(client => client.connection);
  if (!excludeSessionHost) {
    sessionConnections.push(session.hostConnection);
  }
  sessionConnections.forEach(connection => sendMessage(connection));
};


const createConnectionManager = (messageHandler) => {
  const sessionManager = createSessionManager();
  let allConnections = [];

  const connectionManager = {};

  connectionManager.addConnection = (connection) => {
    allConnections.push(connection);
  };


  const broadcastAvailableSessions = (ignoredConnection) => {
    const availableSessions = sessionManager.getAvailableSessions().map(session => ({
      id: session.id,
      name: session.name,
    }));
    allConnections.forEach((clientConnection) => {
      if (ignoredConnection !== clientConnection) {
        messageHandler.sendAvailableSessions(clientConnection, availableSessions);
      }
    });
  };

  connectionManager.createSession = (connection, sessionName) => {
    const session = sessionManager.createSession(connection, sessionName);
    messageHandler.sendSessionCreated(connection, session.id);
    broadcastAvailableSessions(connection);
  };

  const broadcastSessionUpdate = (session) => {
    const clientNames = session.clients.map(client => client.name);
    broadcastToSession(
      session,
      connection => messageHandler.sendSessionUpdate(connection, {
        id: session.id,
        clientNames,
      }),
      false,
    );
  };

  connectionManager.connectToSession = (connection, sessionId, name) => {
    const session = sessionManager.findSessionById(sessionId);
    if (!session) {
      return;
    }

    session.clients.push({ connection, name });
    broadcastSessionUpdate(session);
  };


  connectionManager.requestAvailableSessions = (connection) => {
    const availableSessions = sessionManager.getAvailableSessions().map(session => ({
      id: session.id,
      name: session.name,
    }));
    messageHandler.sendAvailableSessions(connection, availableSessions);
  };

  connectionManager.closeConnection = (connection) => {
    winston.log('info', 'closeConnection');
    allConnections = allConnections.filter(otherConnection => otherConnection !== connection);

    const session = sessionManager.findSessionByConnection(connection);
    if (!session) {
      return;
    }

    const isHost = session.hostConnection === connection;
    if (isHost) {
      winston.log('info', 'Host left session, closing session', session.name);
      sessionManager.closeSession(session);
      broadcastAvailableSessions(connection);
    } else {
      const client = session.clients.find(sessionClient => sessionClient.connection === connection);
      winston.log('info', `client ${client.name} left session ${session.name}`);
      session.clients = session.clients
        .filter(otherClients => (otherClients.connection !== connection));

      if (session.clients.length === 0) {
        winston.log('info', `No client left, closing session${session.name}`);
        sessionManager.closeSession(session);
      } else {
        broadcastSessionUpdate(session);
      }
    }
  };

  connectionManager.startSession = (connection) => {
    // TODO Only host should be able to start session
    const session = sessionManager.findSessionByConnection(connection);
    if (!session) {
      return;
    }

    session.createNextStoryEstimation();
    session.isRunning = true;
    broadcastToSession(session, messageHandler.sendStartSession, false);
    // broadcastAvailableSessions(connection);
  };

  connectionManager.vote = (connection, estimation) => {
    const session = sessionManager.findSessionByConnection(connection);

    if (!session) {
      winston.log('info', 'vote: no session found');
      return;
    }

    const voteEvaluation = session.voteCurrentEstimation(connection, estimation);
    broadcastToSession(
      session,
      connection => messageHandler.updateVoteProgress(connection,
        session.getCurrentEstimation().getNumberOfVotes()),
      false,
    );

    if (voteEvaluation) {
      messageHandler.voteFinished(session.hostConnection, voteEvaluation);
    }
  };

  return connectionManager;
};

export default createConnectionManager;
