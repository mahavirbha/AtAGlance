import axios from "axios";

const GOOGLE_PLACES_API_KEY = "AIzaSyDH0SnN_ZcYunKcZ5_kmVqMuP6YFrb5mxQ";
const BASE_URL = "https://maps.googleapis.com/maps/api/place";

export const fetchNearbyPlaces = async (latitude, longitude, radius = 1500) => {
  try {
    const response = await axios.get(`${BASE_URL}/nearbysearch/json`, {
      params: {
        location: `${latitude},${longitude}`,
        radius,
        key: GOOGLE_PLACES_API_KEY,
      },
    });
    return response.data.results;
  } catch (error) {
    console.error("Error fetching nearby places:", error);
    throw error;
  }
};

export const fetchPlaceDetails = async (placeId, reviewSort = "most_relevant") => {
  try {
    const validSort = reviewSort === "newest" ? "newest" : "most_relevant";
    
    const response = await axios.get(`${BASE_URL}/details/json`, {
      params: {
        place_id: placeId,
        key: GOOGLE_PLACES_API_KEY,
        reviews_sort: validSort,
        language: "en",
        reviews_no_translation: true,
      },
    });

    return response.data.result;
  } catch (error) {
    console.error("Error fetching place details:", error);
    throw error;
  }
};
