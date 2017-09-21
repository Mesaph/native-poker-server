import createStoryEstimation from './storyEstimation';

let sessionCounter = 0;

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

  session.getCurrentEstimation = () =>
    session.estimations[session.estimations.length - 1];

  session.getClientNameByConnection = clientConnection =>
    session.clients.find(client => client.connection === clientConnection).name;

  session.voteCurrentEstimation = (clientConnection, estimation) => {
    const clientName = session.getClientNameByConnection(clientConnection);
    // TODO client name is not unique
    const currentEstimation = session.getCurrentEstimation();
    if (!currentEstimation) {
      return false;
    }
    currentEstimation.vote(clientName, estimation);
    let isLastVote = session.clients.length === currentEstimation.getNumberOfVotes();
    if (isLastVote) {
      isLastVote = currentEstimation.evaluate();
    }
    return isLastVote;
  };

  return session;
};

export default createSession;
