import React, { useCallback, useEffect, useState } from 'react';
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
import { router, useFocusEffect } from 'expo-router';
import api from '../../services/api';
import { clearSession, getUser } from '../../services/secureStorage';
import { cardShadow, uiColors } from '../../constants/ui';
import { getErrorMessage } from '../../utils/errorMessage';
import { formatCurrency, formatShowDateTime } from '../../utils/formatters';

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
  total_price?: number;
  can_modify: number | string;
  seat_numbers?: string[];
  has_seat_selection?: number | string;
};

type SessionUser = {
  name?: string;
  email?: string;
};

export default function ProfileScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<number, string>>({});
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyReservationId, setBusyReservationId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      const storedUser = await getUser();
      setUser(storedUser);
    };

    loadUser();
  }, []);

  const formatCreatedAt = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('el-GR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fetchReservations = useCallback(async (withLoading = true) => {
    try {
      if (withLoading) {
        setLoading(true);
      }

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
    } catch (error: unknown) {
      setReservations([]);
      setErrorMessage(getErrorMessage(error, 'Failed to load reservations.'));
    } finally {
      if (withLoading) {
        setLoading(false);
      }
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
    } catch (error: unknown) {
      Alert.alert('Update failed', getErrorMessage(error, 'Unable to update reservation.'));
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
    } catch (error: unknown) {
      Alert.alert('Cancellation failed', getErrorMessage(error, 'Unable to cancel reservation.'));
    } finally {
      setBusyReservationId(null);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchReservations(false);
    } finally {
      setRefreshing(false);
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

  const handleProfilePhotoPress = () => {
    Alert.alert('Profile photo', 'Photo upload can be connected here.');
  };

  const activeReservations = reservations.filter((item) => item.status === 'active').length;
  const cancelledReservations = reservations.filter((item) => item.status !== 'active').length;
  const displayName = user?.name?.trim() || 'Theatre Guest';
  const displayEmail = user?.email?.trim() || 'Signed in member';
  const nameParts = displayName.split(' ').filter(Boolean);
  const avatarInitials = nameParts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'TG';

  const renderReservation = ({ item }: { item: Reservation }) => {
    const canModify = Number(item.can_modify) === 1;
    const hasSeatSelection = Number(item.has_seat_selection) === 1;
    const busy = busyReservationId === item.reservation_id;
    const seatsLabel = (item.seat_numbers || []).join(', ');

    return (
      <View style={styles.reservationCard}>
        <View style={styles.reservationHeader}>
          <View style={styles.reservationTitleWrap}>
            <Text style={styles.reservationKicker}>{item.status === 'active' ? 'Upcoming booking' : 'Past booking'}</Text>
            <Text style={styles.reservationTitle}>{item.show_title}</Text>
            <Text style={styles.reservationSchedule}>
              {formatShowDateTime(item.show_date, item.show_time)}
            </Text>
            <Text style={styles.reservationVenue}>{item.theatre_name} / {item.hall}</Text>
          </View>
          <View
            style={[
              styles.statusPill,
              item.status === 'active' ? styles.statusActive : styles.statusCancelled
            ]}>
            <Text style={styles.statusText}>{String(item.status).toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.reservationMetaRow}>
          <View style={styles.metaStat}>
            <Text style={styles.metaStatLabel}>Tickets</Text>
            <Text style={styles.metaStatValue}>{item.quantity}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaStat}>
            <Text style={styles.metaStatLabel}>Total</Text>
            <Text style={styles.metaStatValue}>{formatCurrency(item.total_price ?? item.price)}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaStat}>
            <Text style={styles.metaStatLabel}>Booked</Text>
            <Text style={styles.metaStatValue}>{formatCreatedAt(item.created_at)}</Text>
          </View>
        </View>

        {hasSeatSelection && seatsLabel ? (
          <View style={styles.inlineDetailRow}>
            <Text style={styles.inlineDetailLabel}>Seats</Text>
            <Text style={styles.inlineDetailValue}>{seatsLabel}</Text>
          </View>
        ) : null}

        <View style={styles.reservationFooter}>
          {canModify && !hasSeatSelection ? (
            <View style={styles.reservationActionsRow}>
              <View style={styles.inputShell}>
                <Text style={styles.inputLabel}>Qty</Text>
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
                  placeholder="1"
                  placeholderTextColor="#8d7a6b"
                  editable={!busy}
                />
              </View>
              <TouchableOpacity
                style={[styles.updateButton, busy && styles.buttonDisabled]}
                onPress={() => {
                  updateReservation(item.reservation_id);
                }}
                disabled={busy}>
                <Text style={styles.primaryButtonText}>Save changes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelButton, busy && styles.buttonDisabled]}
                onPress={() => {
                  confirmCancel(item.reservation_id);
                }}
                disabled={busy}>
                <Text style={styles.secondaryButtonText}>Cancel booking</Text>
              </TouchableOpacity>
            </View>
          ) : canModify && hasSeatSelection ? (
            <View style={styles.stackedActions}>
              <Text style={styles.lockedText}>To change seats, cancel and rebook.</Text>
              <TouchableOpacity
                style={[styles.cancelButton, busy && styles.buttonDisabled]}
                onPress={() => {
                  confirmCancel(item.reservation_id);
                }}
                disabled={busy}>
                <Text style={styles.secondaryButtonText}>Cancel booking</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.lockedText}>This reservation can no longer be modified.</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundBase} />

      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color={uiColors.primary} style={styles.loader} />
        ) : errorMessage ? (
          <View style={styles.infoCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : (
          <FlatList
            data={reservations}
            keyExtractor={(item) => item.reservation_id.toString()}
            renderItem={renderReservation}
            contentContainerStyle={styles.listContent}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            ListHeaderComponent={
              <>
                <View style={styles.heroCard}>
                  <View style={styles.heroTopRow}>
                    <TouchableOpacity style={styles.avatarShell} onPress={handleProfilePhotoPress}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{avatarInitials}</Text>
                      </View>
                      <View style={styles.avatarBadge}>
                        <Text style={styles.avatarBadgeText}>+</Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.heroMainInfo}>
                      <Text style={styles.heroTitle}>{displayName}</Text>
                      <View style={styles.heroStatsInline}>
                        <View style={styles.heroStatInlineItem}>
                          <Text style={styles.heroStatInlineValue}>{reservations.length}</Text>
                          <Text style={styles.heroStatInlineLabel}>Total</Text>
                        </View>
                        <View style={styles.heroStatInlineItem}>
                          <Text style={styles.heroStatInlineValue}>{activeReservations}</Text>
                          <Text style={styles.heroStatInlineLabel}>Active</Text>
                        </View>
                        <View style={styles.heroStatInlineItem}>
                          <Text style={styles.heroStatInlineValue}>{cancelledReservations}</Text>
                          <Text style={styles.heroStatInlineLabel}>History</Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                      <Text style={styles.logoutButtonText}>Logout</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.emailText}>{displayEmail}</Text>
                </View>

                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionEyebrow}>Bookings</Text>
                  <Text style={styles.sectionTitle}>Reservation history</Text>
                  <Text style={styles.sectionSubtitle}>
                    View upcoming plans, adjust quantity when available, or cancel a booking.
                  </Text>
                </View>
              </>
            }
            ListEmptyComponent={
              <View style={styles.infoCard}>
                <Text style={styles.emptyText}>No reservations yet.</Text>
              </View>
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
    backgroundColor: '#120f14'
  },
  backgroundBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#120f14'
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 0
  },
  listContent: {
    paddingBottom: 32
  },
  heroCard: {
    backgroundColor: '#1c1720',
    borderRadius: 28,
    padding: 18,
    marginBottom: 24
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  avatarShell: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2a2230',
    borderWidth: 1,
    borderColor: '#403347',
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow
  },
  avatarText: {
    color: '#fff7eb',
    fontSize: 26,
    fontWeight: '800'
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: uiColors.accent,
    borderWidth: 1,
    borderColor: '#1c1720',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarBadgeText: {
    color: '#22161a',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16
  },
  heroMainInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  heroTitle: {
    fontSize: 26,
    color: '#fff6e7',
    fontWeight: '800'
  },
  heroStatsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 8
  },
  heroStatInlineItem: {
    alignItems: 'flex-start'
  },
  heroStatInlineValue: {
    color: '#fff1df',
    fontSize: 17,
    fontWeight: '700'
  },
  heroStatInlineLabel: {
    color: '#a99aa4',
    fontSize: 12,
    marginTop: 2
  },
  logoutButton: {
    backgroundColor: uiColors.buttonGhost,
    borderWidth: 1,
    borderColor: uiColors.buttonGhostBorder,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999
  },
  logoutButtonText: {
    color: uiColors.heroText,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 14
  },
  emailText: {
    marginTop: 14,
    marginLeft: 104,
    color: '#b8aab2',
    fontSize: 15
  },
  sectionHeading: {
    paddingHorizontal: 4,
    marginBottom: 14
  },
  sectionEyebrow: {
    fontSize: 12,
    color: uiColors.accent,
    fontWeight: '600',
    marginBottom: 6
  },
  sectionTitle: {
    color: '#fff6e7',
    fontSize: 25,
    fontWeight: '800'
  },
  sectionSubtitle: {
    color: '#a99aa4',
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 440
  },
  reservationCard: {
    backgroundColor: '#1c1720',
    borderWidth: 1,
    borderColor: '#34293a',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    ...cardShadow
  },
  reservationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10
  },
  reservationTitleWrap: {
    flex: 1
  },
  reservationKicker: {
    color: '#9e8d97',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4
  },
  reservationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff6e7'
  },
  reservationSchedule: {
    color: '#d7c7ba',
    marginTop: 4,
    lineHeight: 18,
    fontSize: 13
  },
  reservationVenue: {
    color: '#aa98a2',
    marginTop: 2,
    fontSize: 12
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  statusActive: {
    backgroundColor: '#20362b'
  },
  statusCancelled: {
    backgroundColor: '#41272b'
  },
  statusText: {
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.3,
    color: '#f7ecdf'
  },
  reservationMetaRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 10,
    marginTop: 2
  },
  metaStat: {
    flex: 1,
    paddingHorizontal: 4
  },
  metaDivider: {
    width: 1,
    backgroundColor: '#332a38'
  },
  metaStatLabel: {
    color: '#9e8d97',
    fontSize: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  metaStatValue: {
    color: '#fff6e7',
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 16
  },
  inlineDetailRow: {
    paddingTop: 10,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: '#332a38'
  },
  inlineDetailLabel: {
    color: '#9e8d97',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4
  },
  inlineDetailValue: {
    color: '#fff6e7',
    fontWeight: '600',
    fontSize: 12
  },
  reservationFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#332a38'
  },
  reservationActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap'
  },
  stackedActions: {
    gap: 8
  },
  inputShell: {
    minWidth: 70,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#46384d',
    backgroundColor: '#241d29'
  },
  inputLabel: {
    color: '#9e8d97',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2
  },
  quantityInput: {
    minWidth: 34,
    paddingHorizontal: 0,
    paddingVertical: 0,
    textAlign: 'center',
    color: '#fff6e7',
    backgroundColor: 'transparent',
    fontSize: 16,
    fontWeight: '700'
  },
  updateButton: {
    backgroundColor: uiColors.accent,
    borderWidth: 1,
    borderColor: '#e0b869',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    ...cardShadow
  },
  cancelButton: {
    backgroundColor: uiColors.buttonDangerBg,
    borderWidth: 1,
    borderColor: uiColors.buttonDangerBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999
  },
  primaryButtonText: {
    color: '#24161b',
    fontWeight: '700',
    fontSize: 13
  },
  secondaryButtonText: {
    color: uiColors.buttonDangerText,
    fontWeight: '600',
    fontSize: 13
  },
  buttonDisabled: {
    opacity: 0.55
  },
  lockedText: {
    color: '#ae9ea8',
    lineHeight: 18,
    fontSize: 12
  },
  infoCard: {
    backgroundColor: '#1c1720',
    borderWidth: 1,
    borderColor: '#34293a',
    borderRadius: 18,
    padding: 20,
    ...cardShadow
  },
  loader: {
    marginTop: 24
  },
  emptyText: {
    textAlign: 'center',
    color: '#b8aab2'
  },
  errorText: {
    textAlign: 'center',
    color: '#ff9b90',
    lineHeight: 20
  }
});
