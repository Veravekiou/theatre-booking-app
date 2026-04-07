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
import { router } from 'expo-router';
import api from '../../services/api';

type Showtime = {
  showtime_id: number;
  show_title: string;
  theatre_name: string;
  show_date: string;
  show_time: string;
  hall: string;
  price: number;
  available_seats: number;
};

export default function ShowtimesScreen() {
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchShowtimes();
  }, []);

  const fetchShowtimes = async (title?: string) => {
    try {
      setLoading(true);
      setErrorMessage('');
      const response = await api.get('/showtimes', {
        params: title ? { title } : undefined
      });
      setShowtimes(response.data);
    } catch (error: any) {
      const backendMessage =
        error?.response?.data?.message || error?.message || 'Failed to load showtimes';
      setShowtimes([]);
      setErrorMessage(String(backendMessage));
      console.log(error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchShowtimes(searchText.trim() || undefined);
  };

  const renderShowtime = ({ item }: { item: Showtime }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/showtimes/${item.showtime_id}`)}>
      <Text style={styles.title}>{item.show_title}</Text>
      <Text style={styles.meta}>{item.theatre_name}</Text>
      <Text style={styles.meta}>
        {item.show_date} • {item.show_time}
      </Text>
      <Text style={styles.meta}>Hall: {item.hall}</Text>
      <Text style={styles.meta}>Price: {item.price} EUR</Text>
      <Text style={styles.seats}>Available seats: {item.available_seats}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.screenTitle}>Showtimes</Text>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by show title"
            placeholderTextColor="#777"
            value={searchText}
            onChangeText={setSearchText}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#1f5fa6" style={styles.loader} />
        ) : errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : (
          <FlatList
            data={showtimes}
            keyExtractor={(item) => item.showtime_id.toString()}
            renderItem={renderShowtime}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No showtimes found</Text>
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
    backgroundColor: '#f2f2f2'
  },
  container: {
    flex: 1,
    padding: 16
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center'
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    color: '#000'
  },
  searchButton: {
    backgroundColor: '#1f5fa6',
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center'
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    marginBottom: 10
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#111'
  },
  meta: {
    color: '#333',
    marginBottom: 2
  },
  seats: {
    marginTop: 6,
    fontWeight: '700',
    color: '#1f5fa6'
  },
  loader: {
    marginTop: 24
  },
  emptyText: {
    textAlign: 'center',
    color: '#444',
    marginTop: 24
  },
  errorText: {
    textAlign: 'center',
    color: '#b00020',
    marginTop: 24
  }
});
