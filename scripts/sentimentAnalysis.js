import Sentiment from "sentiment";

const sentiment = new Sentiment();

export const analyzeSentiment = (text) => {
  if (!text || typeof text !== "string") {
    return { score: 0, comparative: 0, positive: [], negative: [] };
  }

  const result = sentiment.analyze(text);

  // Normalize the score to a scale of 0-5 (assuming sentiment score ranges from -5 to 5)
  const normalizedScore = Math.max(0, Math.min(5, (result.score + 5) / 2));

  return {
    score: normalizedScore, // Normalized score between 0 and 5
    comparative: result.comparative, // Average score per word
    positive: result.positive, // List of positive words
    negative: result.negative, // List of negative words
  };
};