import { DrawerActions, useNavigation, useRoute } from '@react-navigation/native';
import { View, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CustomHeader() {
  const navigation = useNavigation();
  const route = useRoute();

  // Use route.name as the dynamic title
  const title = route.name
    ?.replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Dashboard';

  return (
    <View style={styles.header}>
      {/* Hamburger menu */}
      <TouchableOpacity
        onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
        style={styles.menuButton}
      >
        <Ionicons name="menu-outline" size={28} color="#000" />
      </TouchableOpacity>

      {/* Title */}
      {/* <Text style={styles.headerTitle}>{title}</Text> */}
      <Image
        source={require('../../assets/images/favicon.png')}
        style={styles.logoImage}
      />

      {/* Placeholder for future buttons like notifications */}
      <View style={{ width: 28 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
  },
  menuButton: {
    padding: 4,
  },
  logoImage: {
    width: 50,
  },
});
