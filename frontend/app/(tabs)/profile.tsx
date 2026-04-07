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
import { clearSession, getToken } from '../../services/secureStorage';

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

      const token = await getToken();
      if (!token) {
        setReservations([]);
        setErrorMessage('Please login again.');
        return;
      }

      const response = await api.get('/user/reservations', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const normalizedRows: Reservation[] = (response.data || []).map((row: Reservation) => ({
        ...row,
        can_modify: Number(row.can_modify)
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
      const token = await getToken();

      if (!token) {
        Alert.alert('Unauthorized', 'Please login again.');
        return;
      }

      await api.put(
        `/reservations/${reservationId}`,
        { quantity: parsedQuantity },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

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
      const token = await getToken();

      if (!token) {
        Alert.alert('Unauthorized', 'Please login again.');
        return;
      }

      await api.delete(`/reservations/${reservationId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

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
    const busy = busyReservationId === item.reservation_id;

    return (
      <View style={styles.card}>
        <Text style={styles.title}>{item.show_title}</Text>
        <Text style={styles.meta}>{item.theatre_name}</Text>
        <Text style={styles.meta}>
          {item.show_date} • {item.show_time}
        </Text>
        <Text style={styles.meta}>Hall: {item.hall}</Text>
        <Text style={styles.meta}>Price: {item.price} EUR</Text>
        <Text style={styles.status}>Status: {item.status}</Text>

        {canModify ? (
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
          <Text style={styles.screenTitle}>My Reservations</Text>
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
    backgroundColor: '#f2f2f2'
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
    fontSize: 26,
    fontWeight: '700',
    color: '#111'
  },
  logoutButton: {
    backgroundColor: '#444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600'
  },
  listContent: {
    paddingBottom: 24
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    color: '#111'
  },
  meta: {
    color: '#333',
    marginBottom: 2
  },
  status: {
    marginTop: 6,
    marginBottom: 8,
    fontWeight: '700',
    color: '#1f5fa6'
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  quantityInput: {
    width: 64,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    textAlign: 'center',
    color: '#111',
    backgroundColor: '#fff'
  },
  updateButton: {
    backgroundColor: '#0d6b38',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8
  },
  cancelButton: {
    backgroundColor: '#b33232',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  lockedText: {
    color: '#666',
    fontStyle: 'italic'
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
