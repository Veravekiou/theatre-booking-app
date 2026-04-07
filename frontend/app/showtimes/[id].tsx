import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import api from '../../services/api';

type Seat = {
  seat_number: string;
  status: 'available' | 'reserved';
};

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
  seats: Seat[];
};

export default function ShowtimeDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const showtimeId = Number(params.id);

  const [showtime, setShowtime] = useState<SeatAvailability | null>(null);
  const [selectedSeatNumbers, setSelectedSeatNumbers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const fetchSeats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/seats', {
        params: { showtimeId }
      });
      setShowtime(response.data);
      setSelectedSeatNumbers([]);
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

  const toggleSeatSelection = (seat: Seat) => {
    if (seat.status !== 'available' || booking) {
      return;
    }

    setSelectedSeatNumbers((previous) => {
      if (previous.includes(seat.seat_number)) {
        return previous.filter((value) => value !== seat.seat_number);
      }

      return [...previous, seat.seat_number];
    });
  };

  const handleReservation = async () => {
    if (selectedSeatNumbers.length === 0) {
      Alert.alert('Select seats', 'Please select at least one seat.');
      return;
    }

    try {
      setBooking(true);
      await api.post('/reservations', {
        showtime_id: showtimeId,
        quantity: selectedSeatNumbers.length,
        seat_numbers: selectedSeatNumbers
      });

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

  const totalPrice = (selectedSeatNumbers.length * Number(showtime.price || 0)).toFixed(2);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{showtime.show_title}</Text>
        <Text style={styles.meta}>
          {showtime.show_date} - {showtime.show_time}
        </Text>
        <Text style={styles.meta}>Hall: {showtime.hall}</Text>
        <Text style={styles.meta}>Price: {showtime.price} EUR</Text>
        <Text style={styles.meta}>Total seats: {showtime.total_seats}</Text>
        <Text style={styles.meta}>Reserved seats: {showtime.reserved_seats}</Text>
        <Text style={styles.seats}>Available seats: {showtime.available_seats}</Text>

        <View style={styles.legendRow}>
          <View style={[styles.legendSwatch, styles.seatAvailable]} />
          <Text style={styles.legendText}>Available</Text>
          <View style={[styles.legendSwatch, styles.seatSelected]} />
          <Text style={styles.legendText}>Selected</Text>
          <View style={[styles.legendSwatch, styles.seatReserved]} />
          <Text style={styles.legendText}>Reserved</Text>
        </View>

        <View style={styles.seatGrid}>
          {showtime.seats.map((seat) => {
            const isSelected = selectedSeatNumbers.includes(seat.seat_number);
            const isReserved = seat.status === 'reserved';

            return (
              <TouchableOpacity
                key={seat.seat_number}
                style={[
                  styles.seatButton,
                  isReserved
                    ? styles.seatReserved
                    : isSelected
                      ? styles.seatSelected
                      : styles.seatAvailable
                ]}
                onPress={() => {
                  toggleSeatSelection(seat);
                }}
                disabled={isReserved || booking}>
                <Text
                  style={[
                    styles.seatText,
                    (isSelected || isReserved) && styles.seatTextInverted
                  ]}>
                  {seat.seat_number}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.selectionInfo}>
          Selected seats ({selectedSeatNumbers.length}):{' '}
          {selectedSeatNumbers.length > 0 ? selectedSeatNumbers.join(', ') : 'None'}
        </Text>

        <Text style={styles.selectionInfo}>Total: {totalPrice} EUR</Text>

        <TouchableOpacity
          style={[
            styles.button,
            (booking || selectedSeatNumbers.length === 0) && styles.buttonDisabled
          ]}
          onPress={handleReservation}
          disabled={booking || selectedSeatNumbers.length === 0}>
          <Text style={styles.buttonText}>
            {booking ? 'Booking...' : 'Book selected seats'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f2f2f2'
  },
  container: {
    padding: 16,
    paddingBottom: 28
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
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 2
  },
  legendText: {
    color: '#444',
    marginRight: 6,
    fontSize: 13
  },
  seatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12
  },
  seatButton: {
    width: '18%',
    margin: '1%',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center'
  },
  seatAvailable: {
    backgroundColor: '#e5f4ea',
    borderWidth: 1,
    borderColor: '#7abf8d'
  },
  seatSelected: {
    backgroundColor: '#1f5fa6',
    borderWidth: 1,
    borderColor: '#1f5fa6'
  },
  seatReserved: {
    backgroundColor: '#d1d5db',
    borderWidth: 1,
    borderColor: '#9ca3af'
  },
  seatText: {
    color: '#111',
    fontWeight: '700',
    fontSize: 12
  },
  seatTextInverted: {
    color: '#fff'
  },
  selectionInfo: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8
  },
  button: {
    backgroundColor: '#1f5fa6',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 6
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
