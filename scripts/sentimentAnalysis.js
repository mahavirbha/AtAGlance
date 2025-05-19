import Sentiment from "sentiment";

const sentiment = new Sentiment();

export const analyzeSentiment = (text) => {
  if (!text || typeof text !== "string") {
    return { score: 0, comparative: 0, positive: [], negative: [] };
  }

  const result = sentiment.analyze(text);
  const normalizedScore = Math.max(0, Math.min(5, (result.score + 5) / 2));

  return {
    score: normalizedScore,
    comparative: result.comparative,
    positive: result.positive,
    negative: result.negative,
  };
};