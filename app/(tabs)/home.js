import { Button, Text, View } from "react-native";
import { useEffect, useState } from "react";
// import { useAuth } from "../../context/auth";
import auth from "@react-native-firebase/auth";

export default function HomeScreen() {
  // const { logout } = useAuth();
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    const user = auth().currentUser;
    if (user) {
      setUserEmail(user.email);
    }
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Welcome, {userEmail || "User"}</Text>
      <Button title="Sign out" onPress={() => auth().signOut()} />
    </View>
  );
}
