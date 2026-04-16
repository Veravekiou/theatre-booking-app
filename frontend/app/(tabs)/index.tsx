import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import api from '../../services/api';
import { cardShadow, uiColors } from '../../constants/ui';

type Theatre = {
  theatre_id: number;
  name: string;
  location: string;
  description: string;
};

export default function HomeScreen() {
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchTheatres();
  }, []);

  const fetchTheatres = async (name?: string, location?: string) => {
    try {
      setLoading(true);
      setErrorMessage('');

      const params: Record<string, string> = {};
      if (name) params.name = name;
      if (location) params.location = location;

      const response = await api.get('/theatres', {
        params: Object.keys(params).length > 0 ? params : undefined
      });

      setTheatres(response.data);
    } catch (error: any) {
      setTheatres([]);
      const message = error?.response?.data?.message || error?.message || 'Failed to load theatres';
      setErrorMessage(String(message));
      console.log(error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchTheatres(nameFilter.trim() || undefined, locationFilter.trim() || undefined);
  };

  const handleClear = () => {
    setNameFilter('');
    setLocationFilter('');
    fetchTheatres();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Discover Theatres</Text>
        <Text style={styles.subtitle}>Find venues by name or location.</Text>

        <View style={styles.searchColumn}>
          <TextInput
            style={styles.input}
            placeholder="Theatre name"
            placeholderTextColor="#7b8798"
            value={nameFilter}
            onChangeText={setNameFilter}
          />
          <TextInput
            style={styles.input}
            placeholder="Location"
            placeholderTextColor="#7b8798"
            value={locationFilter}
            onChangeText={setLocationFilter}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              <Text style={styles.buttonText}>Search</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <Text style={styles.buttonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#1f5fa6" style={styles.loader} />
        ) : errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : (
          <FlatList
            data={theatres}
            keyExtractor={(item) => item.theatre_id.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.locationBadge}>{item.location}</Text>
                </View>
                <Text style={styles.text}>{item.description || 'No description available.'}</Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No theatres found</Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: uiColors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: uiColors.background,
  },
  title: {
    fontSize: 30,
    textAlign: 'left',
    color: uiColors.text,
    fontWeight: '800',
  },
  subtitle: {
    color: uiColors.textMuted,
    marginTop: 4,
    marginBottom: 12,
  },
  searchColumn: {
    backgroundColor: uiColors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: uiColors.border,
    marginBottom: 12,
    gap: 8,
    ...cardShadow,
  },
  input: {
    backgroundColor: uiColors.surface,
    borderWidth: 1,
    borderColor: uiColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: uiColors.text,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchButton: {
    flex: 1,
    backgroundColor: uiColors.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#64748b',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  buttonText: {
    color: uiColors.surface,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 28,
  },
  card: {
    backgroundColor: uiColors.surface,
    borderWidth: 1,
    borderColor: uiColors.border,
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    ...cardShadow,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: uiColors.text,
    marginBottom: 2,
  },
  locationBadge: {
    color: uiColors.primaryDark,
    backgroundColor: uiColors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    overflow: 'hidden',
    fontWeight: '600',
  },
  text: {
    color: uiColors.textMuted,
    lineHeight: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: uiColors.textMuted,
    marginTop: 24,
  },
  loader: {
    marginTop: 24,
  },
  errorText: {
    textAlign: 'center',
    color: uiColors.danger,
    marginTop: 24,
  },
});
