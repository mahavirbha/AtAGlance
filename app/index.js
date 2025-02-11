// app/index.js
import auth from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useState } from "react";
import {
  ActivityIndicator,
  Button,
  KeyboardAvoidingView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

GoogleSignin.configure({
  webClientId:
    "685322734996-5v509dmq3sen168tjf5ani3kridihkpe.apps.googleusercontent.com",
  scopes: ["email", "profile"],
});

export default function Index() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const signUp = async () => {
    setLoading(true);
    try {
      await auth().createUserWithEmailAndPassword(email, password);
      alert("Check your emails!");
    } catch (e) {
      alert("Registration failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email, password);
    } catch (e) {
      alert("Sign in failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const onGoogleButtonPress = async () => {
    try {
      await GoogleSignin.signOut(); // Optional: Only if you need to force re-authentication

      // Check Play Services
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      // Sign in
      const googleSignInResult = await GoogleSignin.signIn();
      const { idToken } = googleSignInResult?.data;

      if (idToken) {
        // Create Firebase credential
        const googleCredential = auth.GoogleAuthProvider.credential(idToken);

        // Sign in to Firebase
        await auth().signInWithCredential(googleCredential);
      }
    } catch (error) {
      console.error("Google Sign-In Error:", error);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior="padding">
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
        />
        {loading ? (
          <ActivityIndicator size="small" style={{ margin: 28 }} />
        ) : (
          <View style={{ gap: 8, paddingTop: 16 }}>
            <Button onPress={signIn} title="Login" />
            <Button onPress={signUp} title="Create account" />
            <Button
              title="Sign In with Google"
              color="green"
              onPress={() => onGoogleButtonPress()}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    flex: 1,
    justifyContent: "center",
  },
  input: {
    marginVertical: 4,
    height: 50,
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    backgroundColor: "#fff",
  },
});
