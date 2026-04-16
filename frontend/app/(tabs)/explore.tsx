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
import { cardShadow, uiColors } from '../../constants/ui';

type Showtime = {
  showtime_id: number;
  show_title: string;
  theatre_name: string;
  theatre_location: string;
  show_date: string;
  show_time: string;
  hall: string;
  price: number;
  available_seats: number;
};

type ShowtimeFilters = {
  title?: string;
  theatreName?: string;
  location?: string;
  date?: string;
};

export default function ShowtimesScreen() {
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [titleFilter, setTitleFilter] = useState('');
  const [theatreNameFilter, setTheatreNameFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchShowtimes();
  }, []);

  const fetchShowtimes = async (filters?: ShowtimeFilters) => {
    try {
      setLoading(true);
      setErrorMessage('');

      const response = await api.get('/showtimes', {
        params: filters
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
    fetchShowtimes({
      title: titleFilter.trim() || undefined,
      theatreName: theatreNameFilter.trim() || undefined,
      location: locationFilter.trim() || undefined,
      date: dateFilter.trim() || undefined
    });
  };

  const handleClear = () => {
    setTitleFilter('');
    setTheatreNameFilter('');
    setLocationFilter('');
    setDateFilter('');
    fetchShowtimes();
  };

  const renderShowtime = ({ item }: { item: Showtime }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/showtimes/${item.showtime_id}`)}>
      <Text style={styles.title}>{item.show_title}</Text>
      <Text style={styles.meta}>{item.theatre_name} - {item.theatre_location}</Text>
      <Text style={styles.meta}>
        {item.show_date} - {item.show_time}
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
        <Text style={styles.subtitle}>Search by title, theatre, location or date.</Text>

        <View style={styles.searchPanel}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Show title"
              placeholderTextColor="#7b8798"
              value={titleFilter}
              onChangeText={setTitleFilter}
            />
          </View>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Theatre name"
              placeholderTextColor="#7b8798"
              value={theatreNameFilter}
              onChangeText={setTheatreNameFilter}
            />
          </View>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Location"
              placeholderTextColor="#7b8798"
              value={locationFilter}
              onChangeText={setLocationFilter}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Date YYYY-MM-DD"
              placeholderTextColor="#7b8798"
              value={dateFilter}
              onChangeText={setDateFilter}
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <Text style={styles.searchButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
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
            contentContainerStyle={styles.listContent}
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
    backgroundColor: uiColors.background
  },
  container: {
    flex: 1,
    padding: 16
  },
  screenTitle: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 4,
    color: uiColors.text
  },
  subtitle: {
    color: uiColors.textMuted,
    marginBottom: 12
  },
  searchPanel: {
    backgroundColor: uiColors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: uiColors.border,
    padding: 12,
    marginBottom: 12,
    ...cardShadow
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: uiColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: uiColors.surface,
    color: uiColors.text
  },
  searchButton: {
    flex: 1,
    backgroundColor: uiColors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center'
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#64748b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchButtonText: {
    color: uiColors.surface,
    fontWeight: '700'
  },
  listContent: {
    paddingBottom: 26
  },
  card: {
    backgroundColor: uiColors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: uiColors.border,
    padding: 12,
    marginBottom: 12,
    ...cardShadow
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    color: uiColors.text
  },
  meta: {
    color: uiColors.textMuted,
    marginBottom: 2
  },
  seats: {
    marginTop: 6,
    fontWeight: '700',
    color: uiColors.primaryDark
  },
  loader: {
    marginTop: 24
  },
  emptyText: {
    textAlign: 'center',
    color: uiColors.textMuted,
    marginTop: 24
  },
  errorText: {
    textAlign: 'center',
    color: uiColors.danger,
    marginTop: 24
  }
});
