import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { fetchPlaceDetails } from "../../scripts/placesApi";
import { LineChart } from "react-native-gifted-charts";
import { useGlobalSearchParams, useSearchParams } from "expo-router";

import { db } from "../../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  addDoc,
  serverTimestamp,
  setDoc,
  doc,
} from "firebase/firestore";
import { analyzeSentiment } from "../../scripts/sentimentAnalysis";

const calculateSentimentScore = (reviews) => {
  if (!reviews) return 0;

  const sentimentScores = reviews.map((review) => {
    const sentiment = analyzeSentiment(review.text);
    console.log("Sentiment Analysis Result:", sentiment);
    return sentiment.score;
  });

  const totalScore = sentimentScores.reduce((acc, score) => acc + score, 0);
  return totalScore / reviews.length;
};

const fetchHistoricalScores = async (placeId) => {
  try {
    console.log("Fetching historical scores for placeId:", placeId);

    // Query the collection
    const q = query(
      collection(db, "placeScores"),
      where("placeId", "==", placeId),
      orderBy("timestamp", "asc")
    );
    console.log("Query created:", q);

    const querySnapshot = await getDocs(q);
    console.log("Query snapshot:", querySnapshot);

    const scores = [];
    querySnapshot.forEach((doc) => {
      console.log("Document data:", doc.data());
      scores.push({ id: doc.id, ...doc.data() });
    });

    console.log("Fetched scores:", scores);

    // If no documents exist, add a placeholder document
    if (scores.length === 0) {
      console.log("No historical scores found. Adding a placeholder.");
      const placeholderDocRef = doc(collection(db, "placeScores"));
      await setDoc(placeholderDocRef, {
        placeId,
        sentimentScore: 0, // Default score
        timestamp: serverTimestamp(),
      });
      console.log("Placeholder document added.");
    }

    return scores;
  } catch (error) {
    console.error("Error fetching historical scores:", error);
    return [];
  }
};

const saveSentimentScore = async (placeId, sentimentScore) => {
  try {
    console.log("Saving sentiment score for placeId:", placeId);

    // Add or update the document
    const docRef = doc(collection(db, "placeScores"), placeId);
    await setDoc(
      docRef,
      {
        placeId,
        sentimentScore,
        timestamp: serverTimestamp(),
      },
      { merge: true }
    ); // Merge ensures existing fields are not overwritten

    console.log("Sentiment score saved successfully.");
  } catch (error) {
    console.error("Error saving sentiment score:", error);
  }
};

const calculateFinalScore = (
  historicalScores,
  currentSentimentScore,
  reviewScore
) => {
  // Calculate the average historical score
  const historicalAverage =
    historicalScores.length > 0
      ? historicalScores.reduce(
          (acc, score) => acc + (score.sentimentScore || 0),
          0
        ) / historicalScores.length
      : 0;

  // Ensure all scores are valid numbers
  const validSentimentScore = isNaN(currentSentimentScore)
    ? 0
    : currentSentimentScore;
  const validReviewScore = isNaN(reviewScore) ? 0 : reviewScore;

  // Normalize scores to a scale of 0-100
  console.log("historicalAverage:", historicalAverage);
  console.log("validSentimentScore:", validSentimentScore);
  console.log("validReviewScore:", validReviewScore);
  const normalizedHistoricalScore = historicalAverage * 20; // Assuming historical scores are out of 5
  const normalizedSentimentScore = validSentimentScore * 20; // Assuming sentiment scores are out of 5
  const normalizedReviewScore = validReviewScore * 20; // Assuming review scores are out of 5

  // Assign weights to each component
  const historicalWeight = 0.4; // 40% weight
  const sentimentWeight = 0.4; // 40% weight
  const reviewWeight = 0.2; // 20% weight

  // Calculate the final score
  const finalScore =
    normalizedHistoricalScore * historicalWeight +
    normalizedSentimentScore * sentimentWeight +
    normalizedReviewScore * reviewWeight;

  return Math.round(finalScore); // Return final score rounded to the nearest integer
};

const saveFinalScore = async (placeId, finalScore) => {
  try {
    console.log("Saving final score for placeId:", placeId);

    // Add or update the document
    const docRef = doc(collection(db, "placeScores"), placeId);
    await setDoc(
      docRef,
      {
        placeId,
        finalScore,
        timestamp: serverTimestamp(),
      },
      { merge: true }
    ); // Merge ensures existing fields are not overwritten

    console.log("Final score saved successfully.");
  } catch (error) {
    console.error("Error saving final score:", error);
  }
};

export default function PlaceDetailsScreen() {
  const { placeId } = useGlobalSearchParams(); // Retrieve placeId from route parameters

  const [placeDetails, setPlaceDetails] = useState(null);
  const [historicalScores, setHistoricalScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [finalScore, setFinalScore] = useState(0); // Add state for final score
  const [currentSentimentScore, setCurrentSentimentScore] = useState(0); // Add state for current sentiment score

  useEffect(() => {
    const getPlaceDetails = async () => {
      try {
        const details = await fetchPlaceDetails(placeId);
        setPlaceDetails(details);

        if (details.reviews) {
          const sentimentScore = calculateSentimentScore(details.reviews);
          console.log("Sentiment Score:", sentimentScore);

          // Update the current sentiment score in state
          setCurrentSentimentScore(sentimentScore);

          // Fetch historical scores
          const historicalScores = await fetchHistoricalScores(placeId);
          setHistoricalScores(historicalScores);

          // Calculate the final score
          const reviewScore = details.rating || 0; // Use the place's average rating
          const calculatedFinalScore = calculateFinalScore(
            historicalScores,
            sentimentScore,
            reviewScore
          );
          console.log("Final Score:", calculatedFinalScore);

          // Save the final score to Firestore
          await saveFinalScore(placeId, calculatedFinalScore);

          // Update the final score in state
          setFinalScore(calculatedFinalScore);
        }
      } catch (error) {
        console.error("Error fetching place details:", error);
      } finally {
        setLoading(false);
      }
    };

    if (placeId) {
      getPlaceDetails();
    }
  }, [placeId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{placeDetails?.name || "Place Details"}</Text>
      <Text style={styles.subtitle}>
        {placeDetails?.formatted_address || "Address not available"}
      </Text>

      <Text style={styles.sectionTitle}>Final Score:</Text>
      <Text style={styles.finalScore}>{finalScore.toFixed(2)}</Text>

      <Text style={styles.sectionTitle}>Score Breakdown:</Text>
      <Text style={styles.breakdownText}>
        Historical Average Score:{" "}
        {historicalScores.length > 0
          ? (
              historicalScores.reduce(
                (acc, score) => acc + (score.sentimentScore || 0),
                0
              ) / historicalScores.length
            ).toFixed(2)
          : "0.00"}
      </Text>
      <Text style={styles.breakdownText}>
        Current Sentiment Score: {currentSentimentScore.toFixed(2)}
      </Text>
      <Text style={styles.breakdownText}>
        Review Score:{" "}
        {placeDetails?.rating ? placeDetails.rating.toFixed(2) : "0.00"}
      </Text>

      <Text style={styles.sectionTitle}>Historical Trends:</Text>
      {historicalScores.length > 0 ? (
        <LineChart
          data={historicalScores.map((score, index) => ({
            value: score.sentimentScore,
            label: `Day ${index + 1}`,
          }))}
          width={300}
          height={200}
          isAnimated
          yAxisThickness={0}
          xAxisThickness={0}
          color="blue"
          noOfSections={4}
        />
      ) : (
        <Text>No historical data available.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  finalScore: {
    fontSize: 24,
    fontWeight: "bold",
    color: "green",
    marginBottom: 16,
  },
  breakdownText: {
    fontSize: 16,
    marginBottom: 4,
  },
});
