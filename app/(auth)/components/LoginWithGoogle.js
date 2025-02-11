import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect } from "react";
import { Text, TouchableOpacity, View } from "react-native";
const webClientId =
  "124101934814-5o01ln8mbi5cbll2nf4l23nvluq71j47.apps.googleusercontent.com";
const androidClientId =
  "124101934814-1ekr4hlvbo46iv9191c6o50irhfhec04.apps.googleusercontent.com";

WebBrowser.maybeCompleteAuthSession();

const LoginWithGoogle = () => {
  const config = {
    webClientId,
    androidClientId,
  };

  const [request, response, promptAsync] = Google.useAuthRequest(config);

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <TouchableOpacity onPress={() => promptAsync()}>
        <Text>Sign In with Google</Text>
      </TouchableOpacity>
    </View>
  );

  const handleToken = async () => {
    if (response?.type === "success") {
      const { authentication } = response;
      console.log("authentication:", authentication);
      const token = authentication?.accessToken;
      console.log("token:", token);
    }

    useEffect(() => {
      handleToken();
    }, [response]);
  };
};

export default LoginWithGoogle;
