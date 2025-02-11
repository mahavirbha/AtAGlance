import { Button, Text, View } from "react-native";
// import { useAuth } from "../../context/auth";
import auth from "@react-native-firebase/auth";

export default function HomeScreen() {
  // const { logout } = useAuth();

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Home Screen</Text>
      <Button title="Sign out" onPress={() => auth().signOut()} />
    </View>
  );
}
