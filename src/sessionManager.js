import createSession from './session';

const createSessionManager = () => {
  let sessions = [];
  const sessionManager = {};

  sessionManager.createSession = (hostConnection, name) => {
    const session = createSession(hostConnection, name);
    sessions.push(session);
    return session;
  };

  sessionManager.findSessionByConnection = connection =>
    sessions.find(session => session.hostConnection === connection ||
        session.clients.some(client => client.connection === connection));

  sessionManager.findSessionById = id =>
    sessions.find(session => session.id === id);

  // TODO Filter later
  sessionManager.getAvailableSessions = () => sessions;

  sessionManager.closeSession = (sessionToClose) => {
    sessions = sessions.filter(session => session.id !== sessionToClose.id);
  };

  sessionManager.getAllConnections = () => {
    let connections = [];
    sessions.forEach((session) => {
      const sessionConnections = [
        session.hostConnection,
        ...session.clients.map(client => client.connection),
      ];
      connections = connections.concat(sessionConnections);
    });
    return connections;
  };

  return sessionManager;
};

export default createSessionManager;
