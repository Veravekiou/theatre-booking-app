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
        <Text style={styles.title}>Theatres</Text>

        <View style={styles.searchColumn}>
          <TextInput
            style={styles.input}
            placeholder="Theatre name"
            placeholderTextColor="#777"
            value={nameFilter}
            onChangeText={setNameFilter}
          />
          <TextInput
            style={styles.input}
            placeholder="Location"
            placeholderTextColor="#777"
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
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.text}>{item.location}</Text>
                <Text style={styles.text}>{item.description}</Text>
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
    backgroundColor: '#f2f2f2',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f2f2f2',
  },
  title: {
    fontSize: 28,
    marginBottom: 12,
    textAlign: 'center',
    color: '#000',
    fontWeight: 'bold',
  },
  searchColumn: {
    marginBottom: 12,
    gap: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#000',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchButton: {
    flex: 1,
    backgroundColor: '#1f5fa6',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#6b7280',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  text: {
    color: '#333',
    marginBottom: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#333',
    marginTop: 20,
  },
  loader: {
    marginTop: 24,
  },
  errorText: {
    textAlign: 'center',
    color: '#b00020',
    marginTop: 24,
  },
});
