
let storyCounter = 0;

const isSet = value => Boolean(value) || value === 0 || value === false;

const createStoryEstimation = () => {
  const clientToEstimationMapping = new Map();

  let lockEstimation = false;

  const storyEstimation = {
    id: storyCounter++,

  };
  storyEstimation.vote = (clientName, estimation) => {
    if (!lockEstimation) {
      clientToEstimationMapping.set(clientName, parseFloat(estimation));
    }
  };

  storyEstimation.evaluate = () => {
    // lock any other vote.
    lockEstimation = true;

    let minClientName;
    let minEstimation;
    let maxClientName;
    let maxEstimation;
    let estimationSum = 0;

    clientToEstimationMapping.forEach((estimation, clientName) => {
      if (!isSet(minEstimation) || estimation < minEstimation) {
        minClientName = clientName;
        minEstimation = estimation;
      }
      if (!isSet(maxEstimation) || estimation > maxEstimation) {
        maxClientName = clientName;
        maxEstimation = estimation;
      }
      estimationSum += estimation;
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
  storyEstimation.getNumberOfVotes = () => clientToEstimationMapping.size;
  return storyEstimation;
};

export default createStoryEstimation;
