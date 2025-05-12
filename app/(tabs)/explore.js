// app/(tabs)/explore.js
import React, { useState } from "react";
import { View, TextInput, Button, FlatList, Text, StyleSheet } from "react-native";
import { fetchNearbyPlaces } from "../../scripts/placesApi";
import { useRouter } from "expo-router";
import { db } from "../../firebaseConfig";
import { collection, query, where, getDocs } from "@react-native-firebase/firestore";

const fetchHistoricalScores = async (placeId) => {
  try {
    const q = query(
      collection(db, "placeScores"),
      where("placeId", "==", placeId)
    );
    const querySnapshot = await getDocs(q);
    const scores = [];
    querySnapshot.forEach((doc) => {
      scores.push({ id: doc.id, ...doc.data() });
    });
    return scores;
  } catch (error) {
    console.error("Error fetching historical scores:", error);
    return [];
  }
};

export default function ExploreScreen() {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSearch = async () => {
    setLoading(true);
    try {
      const results = await fetchNearbyPlaces(latitude, longitude);
      console.log("results:", results)
      setPlaces(results);
    } catch (error) {
      console.error("Error fetching places:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceDetails = async (placeId) => {
    const historicalScores = await fetchHistoricalScores(placeId);
    console.log("Historical Scores:", historicalScores);
    router.push(`/place-details/${placeId}`);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Enter Latitude"
        value={latitude}
        onChangeText={setLatitude}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Enter Longitude"
        value={longitude}
        onChangeText={setLongitude}
        keyboardType="numeric"
      />
      <Button title="Search Nearby Places" onPress={handleSearch} disabled={loading} />
      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => item.place_id}
          renderItem={({ item }) => (
            <View style={styles.placeItem}>
              <Text style={styles.placeName}>{item.name}</Text>
              <Text>{item.vicinity}</Text>
              <Button
                title="Details"
                onPress={() => handlePlaceDetails(item.place_id)}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  placeItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  placeName: {
    fontWeight: "bold",
  },
});
