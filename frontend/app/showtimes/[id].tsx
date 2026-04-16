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
import { cardShadow, uiColors } from '../../constants/ui';

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
        <View style={styles.infoCard}>
          <Text style={styles.title}>{showtime.show_title}</Text>
          <Text style={styles.meta}>
            {showtime.show_date} - {showtime.show_time}
          </Text>
          <Text style={styles.meta}>Hall: {showtime.hall}</Text>
          <Text style={styles.meta}>Price: {showtime.price} EUR</Text>
          <Text style={styles.meta}>Total seats: {showtime.total_seats}</Text>
          <Text style={styles.meta}>Reserved seats: {showtime.reserved_seats}</Text>
          <Text style={styles.seats}>Available seats: {showtime.available_seats}</Text>
        </View>

        <View style={styles.legendCard}>
          <View style={styles.legendRow}>
            <View style={[styles.legendSwatch, styles.seatAvailable]} />
            <Text style={styles.legendText}>Available</Text>
            <View style={[styles.legendSwatch, styles.seatSelected]} />
            <Text style={styles.legendText}>Selected</Text>
            <View style={[styles.legendSwatch, styles.seatReserved]} />
            <Text style={styles.legendText}>Reserved</Text>
          </View>
        </View>

        <View style={styles.seatGridCard}>
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
        </View>

        <View style={styles.selectionCard}>
          <Text style={styles.selectionInfo}>
            Selected seats ({selectedSeatNumbers.length}):{' '}
            {selectedSeatNumbers.length > 0 ? selectedSeatNumbers.join(', ') : 'None'}
          </Text>
          <Text style={styles.selectionTotal}>Total: {totalPrice} EUR</Text>
        </View>

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
    backgroundColor: uiColors.background
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
    fontWeight: '800',
    marginBottom: 8,
    color: uiColors.text
  },
  meta: {
    fontSize: 15,
    marginBottom: 4,
    color: uiColors.textMuted
  },
  seats: {
    marginTop: 8,
    marginBottom: 2,
    fontWeight: '700',
    color: uiColors.primaryDark
  },
  infoCard: {
    backgroundColor: uiColors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: uiColors.border,
    marginBottom: 10,
    ...cardShadow
  },
  legendCard: {
    backgroundColor: uiColors.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: uiColors.border,
    marginBottom: 10
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
    color: uiColors.textMuted,
    marginRight: 6,
    fontSize: 13
  },
  seatGridCard: {
    backgroundColor: uiColors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: uiColors.border,
    padding: 8,
    marginBottom: 10,
    ...cardShadow
  },
  seatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  seatButton: {
    width: '18%',
    margin: '1%',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center'
  },
  seatAvailable: {
    backgroundColor: '#e9f8ef',
    borderWidth: 1,
    borderColor: '#7ac799'
  },
  seatSelected: {
    backgroundColor: uiColors.primary,
    borderWidth: 1,
    borderColor: uiColors.primary
  },
  seatReserved: {
    backgroundColor: '#d8dee9',
    borderWidth: 1,
    borderColor: '#9ca3af'
  },
  seatText: {
    color: uiColors.text,
    fontWeight: '700',
    fontSize: 12
  },
  seatTextInverted: {
    color: '#fff'
  },
  selectionCard: {
    backgroundColor: uiColors.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: uiColors.border,
    padding: 12,
    marginBottom: 8
  },
  selectionInfo: {
    fontSize: 14,
    color: uiColors.textMuted,
    marginBottom: 8
  },
  selectionTotal: {
    fontSize: 16,
    color: uiColors.text,
    fontWeight: '700'
  },
  button: {
    backgroundColor: uiColors.primary,
    borderRadius: 12,
    paddingVertical: 13,
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
    color: uiColors.textMuted
  }
});
