// app/(tabs)/explore.js
import React, { useState, useEffect } from "react";
import { View, TextInput, Button, FlatList, Text, StyleSheet } from "react-native";
import * as Location from "expo-location";
import { fetchNearbyPlaces } from "../../scripts/placesApi";
import { useRouter } from "expo-router";
import { db } from "../../firebaseConfig";
import { collection, query, where, getDocs } from "@react-native-firebase/firestore";
import Slider from "@react-native-community/slider";

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
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [radius, setRadius] = useState(1500); // Default radius in meters
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.error("Permission to access location was denied");
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        console.log("Location fetched:", location);
        setLatitude(location.coords.latitude);
        setLongitude(location.coords.longitude);
      } catch (error) {
        console.error("Error fetching location:", error);
      }
    })();
  }, []);

  const handleSearch = async () => {
    if (!latitude || !longitude) {
      console.error("Location not available");
      return;
    }

    setLoading(true);
    try {
      const results = await fetchNearbyPlaces(latitude, longitude, radius);
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
      <Text style={styles.label}>Radius: {radius} meters</Text>
      <Slider
        style={styles.slider}
        minimumValue={500}
        maximumValue={5000}
        step={100}
        value={radius}
        onValueChange={(value) => setRadius(value)}
        minimumTrackTintColor="#1EB1FC"
        maximumTrackTintColor="#d3d3d3"
        thumbTintColor="#1EB1FC"
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
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  slider: {
    width: "100%",
    height: 40,
    marginBottom: 16,
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
