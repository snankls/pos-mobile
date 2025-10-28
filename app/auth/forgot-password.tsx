import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import axios from "axios";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ForgotPassword() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const NG_URL = process.env.EXPO_PUBLIC_NG_URL;
  
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);

  const onSubmit = async () => {
    if (!identifier.trim()) {
      setMessage("Please enter your username or email address.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");
    setMessageType(null);

    try {
      // Check if input looks like an email
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

      // Send username or email, depending on what user entered
      const payload = isEmail
        ? { email: identifier.trim(), ng_url: NG_URL }
        : { username: identifier.trim(), ng_url: NG_URL };

      const response = await axios.post(`${API_URL}/forgot-password`, payload, {
        headers: { Accept: "application/json" },
      });

      const message =
        response.data?.message || "Password recovery email has been sent!";
      setMessage(message);
      setMessageType("success");
    } catch (error: any) {
      console.error("Forgot Password Error:", error?.response?.data || error);

      const errMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Unable to process request. Please try again later.";

      setMessage(errMsg);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logoContainer}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.logoImage}
              />
              <Text style={styles.subtitle}>
                Enter your username or email address to recover your password.
              </Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Username / Email Address</Text>
                <TextInput
                  style={styles.input}
                  value={identifier}
                  onChangeText={setIdentifier}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!loading}
                  returnKeyType="done"
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

              <View style={styles.footerContainer}>
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
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
    backgroundColor: "#F8F9FA",
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
  footerContainer: {
    marginTop: 24,
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
