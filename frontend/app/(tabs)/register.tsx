import { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { registerUser } from "../../firebase/auth";
import { useRouter } from "expo-router";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleRegister = async () => {
    try {
      await registerUser(email, password);
      router.replace("/dashboard");
    } catch (err: any) {
      Alert.alert("Registration Failed", err.message);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Email</Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" />
      <Text>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Register" onPress={handleRegister} />
      <Button title="Back to Login" onPress={() => router.push("/login")} />
    </View>
  );
}
