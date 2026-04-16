import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import api from '../../services/api';
import { clearSession } from '../../services/secureStorage';
import { cardShadow, uiColors } from '../../constants/ui';

type Reservation = {
  reservation_id: number;
  showtime_id: number;
  quantity: number;
  status: string;
  created_at: string;
  show_title: string;
  theatre_name: string;
  show_date: string;
  show_time: string;
  hall: string;
  price: number;
  can_modify: number | string;
  seat_numbers?: string[];
  has_seat_selection?: number | string;
};

export default function ProfileScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyReservationId, setBusyReservationId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const response = await api.get('/user/reservations');

      const normalizedRows: Reservation[] = (response.data || []).map((row: Reservation) => ({
        ...row,
        can_modify: Number(row.can_modify),
        has_seat_selection: Number(row.has_seat_selection || 0),
        seat_numbers: Array.isArray(row.seat_numbers) ? row.seat_numbers : []
      }));

      setReservations(normalizedRows);

      const drafts: Record<number, string> = {};
      normalizedRows.forEach((row) => {
        drafts[row.reservation_id] = String(row.quantity);
      });
      setQuantityDrafts(drafts);
    } catch (error: any) {
      setReservations([]);
      const message = error?.response?.data?.message || error?.message || 'Failed to load reservations';
      setErrorMessage(String(message));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchReservations();
    }, [fetchReservations])
  );

  const updateReservation = async (reservationId: number) => {
    const quantityText = quantityDrafts[reservationId];
    const parsedQuantity = Number(quantityText);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      Alert.alert('Invalid quantity', 'Quantity must be a positive integer.');
      return;
    }

    try {
      setBusyReservationId(reservationId);

      await api.put(`/reservations/${reservationId}`, { quantity: parsedQuantity });

      Alert.alert('Success', 'Reservation updated.');
      await fetchReservations();
    } catch (error: any) {
      Alert.alert('Error', JSON.stringify(error.response?.data || error.message));
    } finally {
      setBusyReservationId(null);
    }
  };

  const cancelReservation = async (reservationId: number) => {
    try {
      setBusyReservationId(reservationId);
      await api.delete(`/reservations/${reservationId}`);

      Alert.alert('Success', 'Reservation cancelled.');
      await fetchReservations();
    } catch (error: any) {
      Alert.alert('Error', JSON.stringify(error.response?.data || error.message));
    } finally {
      setBusyReservationId(null);
    }
  };

  const confirmCancel = (reservationId: number) => {
    Alert.alert('Cancel reservation', 'Are you sure you want to cancel this reservation?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: () => {
          cancelReservation(reservationId);
        }
      }
    ]);
  };

  const handleLogout = async () => {
    await clearSession();
    router.replace('/login');
  };

  const renderReservation = ({ item }: { item: Reservation }) => {
    const canModify = Number(item.can_modify) === 1;
    const hasSeatSelection = Number(item.has_seat_selection) === 1;
    const busy = busyReservationId === item.reservation_id;

    return (
      <View style={styles.card}>
        <Text style={styles.title}>{item.show_title}</Text>
        <Text style={styles.meta}>{item.theatre_name}</Text>
        <Text style={styles.meta}>
          {item.show_date} - {item.show_time}
        </Text>
        <Text style={styles.meta}>Hall: {item.hall}</Text>
        <Text style={styles.meta}>Price: {item.price} EUR</Text>
        {hasSeatSelection ? (
          <Text style={styles.meta}>Seats: {(item.seat_numbers || []).join(', ')}</Text>
        ) : null}
        <View
          style={[
            styles.statusPill,
            item.status === 'active' ? styles.statusActive : styles.statusCancelled
          ]}>
          <Text style={styles.statusText}>{String(item.status).toUpperCase()}</Text>
        </View>

        {canModify && !hasSeatSelection ? (
          <View style={styles.actionsContainer}>
            <TextInput
              style={styles.quantityInput}
              keyboardType="numeric"
              value={quantityDrafts[item.reservation_id] || ''}
              onChangeText={(value) => {
                setQuantityDrafts((prev) => ({
                  ...prev,
                  [item.reservation_id]: value
                }));
              }}
              placeholder="Qty"
              placeholderTextColor="#777"
              editable={!busy}
            />
            <TouchableOpacity
              style={[styles.updateButton, busy && styles.buttonDisabled]}
              onPress={() => {
                updateReservation(item.reservation_id);
              }}
              disabled={busy}>
              <Text style={styles.buttonText}>Update</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelButton, busy && styles.buttonDisabled]}
              onPress={() => {
                confirmCancel(item.reservation_id);
              }}
              disabled={busy}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : canModify && hasSeatSelection ? (
          <View style={styles.actionsContainer}>
            <Text style={styles.lockedText}>To change seats, cancel and rebook.</Text>
            <TouchableOpacity
              style={[styles.cancelButton, busy && styles.buttonDisabled]}
              onPress={() => {
                confirmCancel(item.reservation_id);
              }}
              disabled={busy}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.lockedText}>This reservation can no longer be modified.</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.screenTitle}>My Reservations</Text>
            <Text style={styles.subtitle}>Manage your upcoming bookings.</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#1f5fa6" style={styles.loader} />
        ) : errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : (
          <FlatList
            data={reservations}
            keyExtractor={(item) => item.reservation_id.toString()}
            renderItem={renderReservation}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={styles.emptyText}>No reservations yet.</Text>}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: uiColors.text
  },
  subtitle: {
    color: uiColors.textMuted,
    marginTop: 2
  },
  logoutButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10
  },
  logoutText: {
    color: uiColors.surface,
    fontWeight: '600'
  },
  listContent: {
    paddingBottom: 24
  },
  card: {
    backgroundColor: uiColors.surface,
    borderWidth: 1,
    borderColor: uiColors.border,
    borderRadius: 14,
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
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  statusActive: {
    backgroundColor: '#eaf8f1'
  },
  statusCancelled: {
    backgroundColor: '#fdecec'
  },
  statusText: {
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.4,
    color: uiColors.text
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  quantityInput: {
    width: 64,
    borderWidth: 1,
    borderColor: uiColors.border,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    textAlign: 'center',
    color: uiColors.text,
    backgroundColor: uiColors.surface
  },
  updateButton: {
    backgroundColor: uiColors.success,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10
  },
  cancelButton: {
    backgroundColor: uiColors.danger,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10
  },
  buttonText: {
    color: uiColors.surface,
    fontWeight: '700'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  lockedText: {
    color: '#64748b',
    fontStyle: 'italic'
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
