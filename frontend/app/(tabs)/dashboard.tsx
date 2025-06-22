import { View, Text, Button } from "react-native";
import { logoutUser } from "../../firebase/auth";
import { useRouter } from "expo-router";

export default function Dashboard() {
  const router = useRouter();

  const handleLogout = async () => {
    await logoutUser();
    router.push("/(tabs)/login");
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Welcome to LifePattern AI!</Text>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}
