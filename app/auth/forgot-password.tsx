import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from "react-native";
import axios from "axios";
import { useRouter } from "expo-router";

export default function ForgotPassword() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);

  const onSubmit = async () => {
    if (!email) {
      Alert.alert("Validation Error", "Please enter your email address.");
      return;
    }

    setLoading(true);
    setMessage("");
    setMessageType(null);

    try {
      const response = await axios.post(`${API_URL}/forgot-password`, { email });
      setMessage(response.data.message || "Password recovery email sent!");
      setMessageType("success");
    } catch (error: any) {
      console.error("Forgot Password Error:", error);
      setMessage(
        error.response?.data?.message ||
          "Unable to process request. Please try again later."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logoImage}
          />
          <Text style={styles.subtitle}>Enter email address to recover your password.</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username / Email address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Recover Password</Text>
            )}
          </TouchableOpacity>

          {/* ✅ Message Area */}
          {message ? (
            <Text
              style={[
                styles.messageText,
                messageType === "error" ? styles.errorText : styles.successText,
              ]}
            >
              {message}
            </Text>
          ) : null}

          <View style={styles.inputContainer}>
            <Text style={styles.forgotText}>
              Already have an account?{" "}
              <Text
                style={styles.linkText}
                onPress={() => router.push("/auth/login")}
              >
                Login
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 50,
  },
  logoImage: {
    width: 150,
    height: (206 / 283) * 150,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e1e1e1",
    fontSize: 16,
    color: "#333",
  },
  loginButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
  },
  loginButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  messageText: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
  },
  errorText: {
    color: "#D9534F",
  },
  successText: {
    color: "#28A745",
  },
  forgotText: {
    textAlign: "center",
    color: "#333",
  },
  linkText: {
    color: "#007AFF",
    fontWeight: "600",
  },
});
