import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { getToken } from '../../services/secureStorage';

type SeatAvailability = {
  showtime_id: number;
  show_title: string;
  show_date: string;
  show_time: string;
  hall: string;
  price: number;
  total_seats: number;
  reserved_seats: number;
  available_seats: number;
};

export default function ShowtimeDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const showtimeId = Number(params.id);

  const [showtime, setShowtime] = useState<SeatAvailability | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const fetchSeats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/seats', {
        params: { showtimeId }
      });
      setShowtime(response.data);
    } catch (error: any) {
      Alert.alert('Error', JSON.stringify(error.response?.data || error.message));
    } finally {
      setLoading(false);
    }
  }, [showtimeId]);

  useEffect(() => {
    if (!Number.isNaN(showtimeId)) {
      fetchSeats();
    }
  }, [showtimeId, fetchSeats]);

  const handleReservation = async () => {
    const parsedQuantity = Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      Alert.alert('Invalid input', 'Quantity must be a positive integer.');
      return;
    }

    try {
      setBooking(true);
      const token = await getToken();

      if (!token) {
        Alert.alert('Unauthorized', 'Please login again.');
        return;
      }

      await api.post(
        '/reservations',
        {
          showtime_id: showtimeId,
          quantity: parsedQuantity
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      Alert.alert('Success', 'Reservation created successfully.');
      await fetchSeats();
    } catch (error: any) {
      Alert.alert('Error', JSON.stringify(error.response?.data || error.message));
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#1f5fa6" style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!showtime) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.errorText}>Showtime not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>{showtime.show_title}</Text>
        <Text style={styles.meta}>
          {showtime.show_date} • {showtime.show_time}
        </Text>
        <Text style={styles.meta}>Hall: {showtime.hall}</Text>
        <Text style={styles.meta}>Price: {showtime.price} EUR</Text>
        <Text style={styles.meta}>Total seats: {showtime.total_seats}</Text>
        <Text style={styles.meta}>Reserved seats: {showtime.reserved_seats}</Text>
        <Text style={styles.seats}>Available seats: {showtime.available_seats}</Text>

        <Text style={styles.label}>Tickets to reserve</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={quantity}
          onChangeText={setQuantity}
          placeholder="e.g. 2"
          placeholderTextColor="#777"
        />

        <TouchableOpacity
          style={[styles.button, booking && styles.buttonDisabled]}
          onPress={handleReservation}
          disabled={booking}>
          <Text style={styles.buttonText}>
            {booking ? 'Booking...' : 'Book now'}
          </Text>
        </TouchableOpacity>
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
  loader: {
    marginTop: 32
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111'
  },
  meta: {
    fontSize: 15,
    marginBottom: 4,
    color: '#333'
  },
  seats: {
    marginTop: 8,
    marginBottom: 16,
    fontWeight: '700',
    color: '#1f5fa6'
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    color: '#000'
  },
  button: {
    backgroundColor: '#1f5fa6',
    borderRadius: 8,
    paddingVertical: 12
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700'
  },
  errorText: {
    fontSize: 16,
    color: '#333'
  }
});
