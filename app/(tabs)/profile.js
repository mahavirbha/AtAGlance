import { View, Text, StyleSheet } from "react-native";
import auth from "@react-native-firebase/auth";
import { useEffect, useState } from "react";

export default function ProfileScreen() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = auth().currentUser;
    setUser(currentUser);
  }, []);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.infoText}>Loading user information...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.infoText}>Name: {user.displayName || "N/A"}</Text>
      <Text style={styles.infoText}>Email: {user.email}</Text>
      <Text style={styles.infoText}>UID: {user.uid}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 10,
  },
});