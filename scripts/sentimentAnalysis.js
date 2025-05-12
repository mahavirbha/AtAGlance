import Sentiment from "sentiment";

const sentiment = new Sentiment();

export const analyzeSentiment = (text) => {
  const result = sentiment.analyze(text);
  return {
    score: result.score, // Overall sentiment score
    comparative: result.comparative, // Average score per word
    positive: result.positive, // List of positive words
    negative: result.negative, // List of negative words
  };
};