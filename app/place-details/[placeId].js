import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { fetchPlaceDetails } from "../../scripts/placesApi";
import { useGlobalSearchParams } from "expo-router";
import { db } from "../../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  setDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { analyzeSentiment } from "../../scripts/sentimentAnalysis";

const fetchHistoricalData = async (placeId) => {
  try {
    const docRef = doc(db, "placeScores", placeId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    }
    return {
      reviewCount: 0,
      processedReviewIds: [],
      totalSentimentSum: 0,
      historicalSentimentScore: 0
    };
  } catch (error) {
    console.error("Error fetching historical data:", error);
    return null;
  }
};

const calculateAggregatedScore = (historicalData, newReviews) => {
  const processedReviewIds = historicalData?.processedReviewIds || [];
  const historicalSentimentSum = historicalData?.totalSentimentSum || 0;
  const historicalReviewCount = historicalData?.reviewCount || 0;
  
  const unprocessedReviews = newReviews.filter(review => 
    !processedReviewIds.includes(review.time?.toString() || review.author_name)
  );
  
  if (unprocessedReviews.length === 0) {
    const historicalAverage = historicalReviewCount > 0 
      ? historicalSentimentSum / historicalReviewCount 
      : 0;

    return {
      reviewCount: historicalReviewCount,
      processedReviewIds: processedReviewIds,
      totalSentimentSum: historicalSentimentSum,
      historicalSentimentScore: historicalAverage,
      currentSentimentScore: 0,
      newReviewsProcessed: 0
    };
  }

  const newReviewResults = unprocessedReviews.map(review => {
    const sentiment = analyzeSentiment(review.text);
    return {
      id: review.time?.toString() || review.author_name,
      score: sentiment.score
    };
  });

  const newSentimentSum = newReviewResults.reduce((sum, result) => sum + result.score, 0);
  const currentSentimentScore = newReviewResults.length > 0 
    ? newSentimentSum / newReviewResults.length 
    : 0;

  const newTotalSum = historicalSentimentSum + newSentimentSum;
  const newTotalCount = historicalReviewCount + unprocessedReviews.length;
  const historicalAverage = newTotalCount > 0 ? newTotalSum / newTotalCount : 0;
  const newProcessedIds = newReviewResults.map(result => result.id);

  return {
    reviewCount: newTotalCount,
    processedReviewIds: [...processedReviewIds, ...newProcessedIds],
    totalSentimentSum: newTotalSum,
    historicalSentimentScore: historicalAverage,
    currentSentimentScore: currentSentimentScore,
    newReviewsProcessed: unprocessedReviews.length
  };
};

const saveHistoricalData = async (placeId, aggregatedData, placeRating) => {
  try {
    const docRef = doc(db, "placeScores", placeId);
    const dataToSave = {
      placeId,
      reviewCount: aggregatedData.reviewCount,
      processedReviewIds: aggregatedData.processedReviewIds,
      totalSentimentSum: aggregatedData.totalSentimentSum,
      historicalSentimentScore: aggregatedData.historicalSentimentScore,
      lastCalculatedRating: placeRating,
      lastUpdated: serverTimestamp(),
    };

    console.log("\n=== Saving Historical Data for PlaceID:", placeId, "===");
    console.log({
      reviewCount: dataToSave.reviewCount,
      totalSentimentSum: dataToSave.totalSentimentSum,
      historicalSentimentScore: dataToSave.historicalSentimentScore,
      processedReviewCount: dataToSave.processedReviewIds.length,
      lastUpdated: new Date().toISOString()
    });

    await setDoc(docRef, dataToSave, { merge: true });
  } catch (error) {
    console.error("Error saving historical data:", error);
  }
};

const getAllReviews = async (placeId) => {
  try {
    const relevantReviews = await fetchPlaceDetails(placeId, 'most_relevant');
    const newReviews = await fetchPlaceDetails(placeId, 'newest');

    const allReviews = [];
    const seenReviewIds = new Set();

    const addUniqueReviews = (reviews) => {
      if (!reviews) return;
      reviews.forEach(review => {
        const reviewId = review.time?.toString() || review.author_name;
        if (!seenReviewIds.has(reviewId)) {
          seenReviewIds.add(reviewId);
          allReviews.push({
            text: review.text,
            time: review.time,
            author_name: review.author_name
          });
        }
      });
    };

    addUniqueReviews(relevantReviews.reviews);
    addUniqueReviews(newReviews.reviews);

    return {
      ...relevantReviews,
      reviews: allReviews
    };
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return null;
  }
};

export default function PlaceDetailsScreen() {
  const { placeId } = useGlobalSearchParams();
  const [placeDetails, setPlaceDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [finalScore, setFinalScore] = useState(0);
  const [currentSentimentScore, setCurrentSentimentScore] = useState(0);
  const [historicalScore, setHistoricalScore] = useState(0);

  const HISTORICAL_WEIGHT = 0.6; // 60% weight for historical sentiment
  const RATING_WEIGHT = 0.4;     // 40% weight for Google rating

  useEffect(() => {
    const getPlaceDetails = async () => {
      try {
        setLoading(true);
        
        const historicalData = await fetchHistoricalData(placeId);
        const details = await getAllReviews(placeId);
        setPlaceDetails(details);
        
        if (details?.reviews) {
          const aggregatedData = calculateAggregatedScore(historicalData, details.reviews);
          
          if (aggregatedData.newReviewsProcessed > 0) {
            await saveHistoricalData(placeId, aggregatedData, details.rating || 0);
            setCurrentSentimentScore(aggregatedData.currentSentimentScore);
            setHistoricalScore(aggregatedData.historicalSentimentScore);
            
            // Calculate weighted final score out of 100
            const weightedScore = (
              (aggregatedData.historicalSentimentScore * HISTORICAL_WEIGHT) + 
              ((details.rating || 0) * RATING_WEIGHT)
            ) * 20; // Convert to 0-100 scale
            
            setFinalScore(weightedScore);
          } else {
            setCurrentSentimentScore(0);
            setHistoricalScore(historicalData.historicalSentimentScore || 0);
            
            // Calculate weighted final score out of 100 using historical data
            const weightedScore = (
              ((historicalData.historicalSentimentScore || 0) * HISTORICAL_WEIGHT) + 
              ((details.rating || 0) * RATING_WEIGHT)
            ) * 20; // Convert to 0-100 scale
            
            setFinalScore(weightedScore);
          }
        }
      } catch (error) {
        console.error("Error in getPlaceDetails:", error);
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
        Historical Average Score: {historicalScore.toFixed(2)}
      </Text>
      <Text style={styles.breakdownText}>
        Current Sentiment Score: {currentSentimentScore.toFixed(2)}
      </Text>
      <Text style={styles.breakdownText}>
        Google Review Score: {placeDetails?.rating ? placeDetails.rating.toFixed(2) : "0.00"}
      </Text>
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
  }
});
