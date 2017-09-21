import winston from "winston";

let sessionCounter = 0;
let storyCounter = 0;
const isSet = value => Boolean(value) || value === 0 || value === false;

const createStoryEstimation =  () => {
    const clientToEstimationMapping = new Map();

    let lockEstimation = false;

    const storyEstimation = {
        id : storyCounter++,

    }
    storyEstimation.vote = (clientName, estimation) => {
        if(!lockEstimation) {
            clientToEstimationMapping.set(clientName, parseFloat(estimation));
        }
    };

    storyEstimation.evaluate = () => {
        lockEstimation = true;
        let minClientName;
        let minEstimation;
        let maxClientName;
        let maxEstimation;
        let estimationSum = 0;

        clientToEstimationMapping.forEach((estimation, clientName) => {
            if(!isSet(minEstimation) || estimation< minEstimation ){
                minClientName = clientName;
                minEstimation = estimation;
            }
            if(!isSet(maxEstimation) || estimation > maxEstimation ){
                maxClientName = clientName;
                maxEstimation = estimation;
            }
            estimationSum+=estimation;
        });

        return {
            minEstimation: {
                clientName: minClientName,
                value: minEstimation,
            },
            maxEstimation: {
                clientName: maxClientName,
                value: maxEstimation,
            },
            averageEstimation: estimationSum / storyEstimation.getNumberOfVotes(),
        };
    };

    storyEstimation.getNumberOfVotes = () => {
        return clientToEstimationMapping.size;
    };


    return storyEstimation;
}


const createSession = (hostConnection, name) => {
    const session = {
        id: sessionCounter++,
        name,
        isRunning: false,
        hostConnection,
        clients: [],
        estimations: [],
    };

    session.createNextStoryEstimation = () => {
        session.estimations.push(createStoryEstimation());
    };

    session.getCurrentEstimation = () => {
        return session.estimations[session.estimations.length - 1];
    };

    session.getClientNameByConnection = ( clientConnection) => {
        return session.clients.find((client) => client.connection === clientConnection).name;
    };

    session.voteCurrentEstimation = (clientConnection, estimation) => {
        // winston.log('info', "session.voteCurrentEstimation ", estimation);
        const clientName = session.getClientNameByConnection(clientConnection);
        // TODO unique client name :/
        const currentEstimation =  session.getCurrentEstimation();
        if(!currentEstimation){
            return false;
        }

        // winston.log('info', "vote  ", {clientName, estimation});

        currentEstimation.vote(clientName, estimation);
        let isLastVote = session.clients.length === currentEstimation.getNumberOfVotes();
        if(isLastVote){
            isLastVote  = currentEstimation.evaluate();

        }
        return isLastVote;
    };

    return session;
};


const createSessionManager = () => {
    let sessions = [];
    const sessionManager = {};

    sessionManager.createSession = (hostConnection, name) => {
        const session =  createSession(hostConnection, name);
        sessions.push(session);
        return session;
    };

    sessionManager.findSessionByConnection = connection =>
        sessions.find((session) => session.hostConnection === connection ||
            session.clients.some((client) => client.connection === connection));

    sessionManager.findSessionById = id =>
        sessions.find((session) => session.id === id);



    sessionManager.getAvailableSessions = () => sessions;

    sessionManager.closeSession = sessionToClose=> {
        sessions = sessions.filter(session => session.id !== sessionToClose.id);
    }

    sessionManager.getAllConnections = () => {
        let connections = [];
        sessions.forEach(session => {
            const sessionConnections = [session.hostConnection, ...session.clients.map(client => client.connection)];
            connections = connections.concat(sessionConnections);
        });
        return connections;
    };

    return sessionManager;
};


const createConnectionManager = function (messageHandler) {

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
        allConnections.forEach(clientConnection => {
            if(ignoredConnection !== clientConnection) {
                messageHandler.sendAvailableSessions(clientConnection, availableSessions);
            }
        });
    }
    connectionManager.createSession = (connection, sessionName) => {
       const session = sessionManager.createSession(connection, sessionName);
       messageHandler.sendSessionCreated(connection, session.id);
       broadcastAvailableSessions(connection);
    };

    const broadcastSessionUpdate = (session) => {
        if(!session){
            return;
        }
        const clientNames = session.clients.map(client => client.name)
        session.clients.map(client => client.connection)
                .concat(session.hostConnection)
                .forEach(connection => {
                    messageHandler.sendSessionUpdate(connection, {
                        id: session.id,
                        clientNames
                    });
                });
    };

    connectionManager.connectToSession = (connection, sessionId, name) => {
        const session = sessionManager.findSessionById(sessionId);
        if(!session){
            return;
        }

        session.clients.push({connection, name});
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
        // winston.log('info', "closeConnection");
        allConnections = allConnections.filter(otherConnection => otherConnection !== connection);

        const session = sessionManager.findSessionByConnection(connection);
        if(!session){
            return;
        }

        const isHost = session.hostConnection === connection;
        if(isHost){
            // winston.log('info', "Host left session, closing session", session.name);
            sessionManager.closeSession(session);
            broadcastAvailableSessions(connection);
        } else {
            const client = session.clients.find(sessionClient => sessionClient.connection === connection);
            // winston.log('info', "client" +client.name+ " left session "+session.name);
            session.clients =  session.clients
                .filter((client) => (client.connection !== connection));

            if(session.clients.length === 0){
                // winston.log('info', "No client left, closing session" +session.name);
                sessionManager.closeSession(session);
            } else {
                broadcastSessionUpdate(session);
            }
        }
    };

    const broadcastSessionStart = (session) => {
        session.clients.map(client => client.connection)
            .forEach(connection => {
                messageHandler.sendStartSession(connection);
            });
    }

    connectionManager.startSession = (connection) => {
        // TODO Only host should be able to start session
        const session = sessionManager.findSessionByConnection(connection);
        if(!session){
            return;
        }

        session.createNextStoryEstimation();
        session.isRunning = true;
        broadcastSessionStart(session);
        //broadcastAvailableSessions(connection);
    };

    connectionManager.vote = (connection, estimation) => {
        const session = sessionManager.findSessionByConnection(connection);

        if(!session){
            // winston.log('info', "vote: no session found");
            return;
        }
        const voteEvaluation = session.voteCurrentEstimation(connection, estimation);
        if(voteEvaluation){
            messageHandler.voteFinished(session.hostConnection, voteEvaluation);
        }
    };

    return connectionManager;
};

export default createConnectionManager;
