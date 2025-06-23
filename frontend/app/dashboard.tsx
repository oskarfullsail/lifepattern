import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Switch,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import AsyncStorage from "@react-native-async-storage/async-storage";

type DashboardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

interface Props {
  navigation: DashboardScreenNavigationProp;
}

export default function Dashboard({ navigation }: Props) {
  const [wakeUpTime, setWakeUpTime] = useState("");
  const [hadMeals, setHadMeals] = useState(false);
  const [screenTime, setScreenTime] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);

  const handleLogout = async () => {
    // TODO: Implement Firebase logout
    console.log('Logout');
    navigation.navigate('Home');
  };

  const handleSubmit = async () => {
    if (!wakeUpTime || !screenTime) {
      Alert.alert("Please fill in all fields.");
      return;
    }
  
    const log = {
      wakeUpTime,
      hadMeals,
      screenTime: Number(screenTime),
      timestamp: new Date().toISOString(),
    };
  
    try {
      const response = await fetch("https://lifepattern-api-635658321303.us-central1.run.app/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(log),
      });
  
      if (response.ok) {
        Alert.alert("✅ Routine submitted to server!");
      } else {
        throw new Error("Server error");
      }
    } catch (err) {
      console.log("Offline, saving locally...", err);
      const existing = await AsyncStorage.getItem("routineQueue");
      const queue = existing ? JSON.parse(existing) : [];
      queue.push(log);
      await AsyncStorage.setItem("routineQueue", JSON.stringify(queue));
      Alert.alert("📦 Saved locally. Will sync when online.");
    }

    setSubmitted(true);
  };

  const handlePickCSV = async () => {
    try {
      // TODO: Implement CSV picker with expo-document-picker
      Alert.alert("CSV Upload", "CSV upload functionality will be implemented");
    } catch (error) {
      Alert.alert("❌ Failed to read CSV", String(error));
    }
  };

  useEffect(() => {
    // TODO: Implement notifications
    console.log("Dashboard mounted");
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📋 Daily Routine Check-In</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>🕗 Wake-Up Time (e.g., 07:00 AM)</Text>
      <TextInput
        style={styles.input}
        placeholder="07:00 AM"
        value={wakeUpTime}
        onChangeText={setWakeUpTime}
      />

      <View style={styles.switchRow}>
        <Text style={styles.label}>🍽️ Had Meals?</Text>
        <Switch value={hadMeals} onValueChange={setHadMeals} />
      </View>

      <Text style={styles.label}>📱 Screen Time (minutes)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 120"
        keyboardType="numeric"
        value={screenTime}
        onChangeText={setScreenTime}
      />

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Submit Routine</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.csvButton} onPress={handlePickCSV}>
        <Text style={styles.csvButtonText}>📂 Upload Routine CSV</Text>
      </TouchableOpacity>

      {submitted && <Text style={styles.success}>✅ Submitted!</Text>}

      {csvData.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.label}>📋 Parsed CSV Entries:</Text>
          {csvData.slice(0, 3).map((row, index) => (
            <Text key={index} style={{ fontSize: 14 }}>
              {JSON.stringify(row)}
            </Text>
          ))}
          {csvData.length > 3 && (
            <Text style={{ fontSize: 14 }}>...and more</Text>
          )}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Analytics</Text>
        <Text style={styles.cardText}>View your progress and insights</Text>
        <TouchableOpacity style={styles.cardButton}>
          <Text style={styles.cardButtonText}>View Analytics</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Settings</Text>
        <Text style={styles.cardText}>Configure your preferences</Text>
        <TouchableOpacity style={styles.cardButton}>
          <Text style={styles.cardButtonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: "#f5f5f5",
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    flex: 1,
  },
  logoutButton: {
    padding: 10,
  },
  logoutText: {
    color: '#007AFF',
    fontSize: 16,
  },
  label: {
    marginBottom: 6,
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 20,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  csvButton: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  csvButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  success: {
    marginTop: 20,
    color: "green",
    fontWeight: "bold",
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  cardButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cardButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 