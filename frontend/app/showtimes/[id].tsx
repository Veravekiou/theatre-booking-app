import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { getErrorMessage } from '../../utils/errorMessage';
import { formatCurrency, formatShowDateTime } from '../../utils/formatters';

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
  vip_price_multiplier?: number;
  total_seats: number;
  reserved_seats: number;
  available_seats: number;
  seats: Seat[];
};

type SeatRow = {
  rowLabel: string;
  seats: Seat[];
};

const parseSeatNumber = (seatNumber: string) => {
  const match = /^([A-Z]+)(\d+)$/.exec((seatNumber || '').toUpperCase());
  if (!match) {
    return null;
  }

  return {
    rowLabel: match[1],
    seatIndex: Number(match[2])
  };
};

const rowLabelToIndex = (rowLabel: string) => {
  let value = 0;
  const normalized = (rowLabel || '').toUpperCase();

  for (let i = 0; i < normalized.length; i += 1) {
    const code = normalized.charCodeAt(i);
    if (code < 65 || code > 90) {
      return Number.MAX_SAFE_INTEGER;
    }
    value = value * 26 + (code - 64);
  }

  return value;
};

const splitIntoSeatBlocks = (seats: Seat[]) => {
  const total = seats.length;
  const base = Math.floor(total / 3);
  const remainder = total % 3;

  const leftCount = base;
  const middleCount = base + remainder;

  const left = seats.slice(0, leftCount);
  const middle = seats.slice(leftCount, leftCount + middleCount);
  const right = seats.slice(leftCount + middleCount);

  return { left, middle, right };
};

const isVipSeatNumber = (seatNumber: string) => {
  const parsed = parseSeatNumber(seatNumber);
  if (!parsed) {
    return false;
  }

  return rowLabelToIndex(parsed.rowLabel) <= 2;
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
    } catch (error: unknown) {
      Alert.alert('Failed to load seats', getErrorMessage(error, 'Please try again.'));
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

      Alert.alert('Reservation confirmed', `Booked ${selectedSeatNumbers.length} seat(s).`);
      await fetchSeats();
    } catch (error: unknown) {
      Alert.alert('Booking failed', getErrorMessage(error, 'Please try again.'));
    } finally {
      setBooking(false);
    }
  };

  const seatRows = useMemo<SeatRow[]>(() => {
    if (!showtime) {
      return [];
    }

    const rows = new Map<string, Seat[]>();
    const unknownRows: Seat[] = [];

    showtime.seats.forEach((seat) => {
      const parsed = parseSeatNumber(seat.seat_number);
      if (!parsed) {
        unknownRows.push(seat);
        return;
      }

      if (!rows.has(parsed.rowLabel)) {
        rows.set(parsed.rowLabel, []);
      }

      rows.get(parsed.rowLabel)?.push(seat);
    });

    const normalizedRows: SeatRow[] = Array.from(rows.entries())
      .sort((a, b) => rowLabelToIndex(a[0]) - rowLabelToIndex(b[0]))
      .map(([rowLabel, seats]) => ({
        rowLabel,
        seats: [...seats].sort((a, b) => {
          const aIndex = parseSeatNumber(a.seat_number)?.seatIndex || 0;
          const bIndex = parseSeatNumber(b.seat_number)?.seatIndex || 0;
          return aIndex - bIndex;
        })
      }));

    if (unknownRows.length > 0) {
      normalizedRows.push({ rowLabel: '-', seats: unknownRows });
    }

    return normalizedRows;
  }, [showtime]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#fff" style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!showtime) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredMessage}>
          <Text style={styles.errorText}>Showtime not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const baseSeatPrice = Number(showtime.price || 0);
  const vipMultiplier = Number(showtime.vip_price_multiplier || 1.15);
  const vipSeatPrice = Math.round(baseSeatPrice * vipMultiplier * 100) / 100;
  const vipSeatCount = selectedSeatNumbers.filter((seatNumber) => isVipSeatNumber(seatNumber)).length;
  const normalSeatCount = Math.max(selectedSeatNumbers.length - vipSeatCount, 0);
  const totalAmount = normalSeatCount * baseSeatPrice + vipSeatCount * vipSeatPrice;
  const totalPrice = formatCurrency(totalAmount);

  const renderSeatButton = (seat: Seat, isVipRow = false) => {
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
              : isVipRow
                ? styles.seatVipAvailable
                : styles.seatAvailable,
          isSelected && isVipRow && styles.seatVipSelected
        ]}
        onPress={() => {
          toggleSeatSelection(seat);
        }}
        disabled={isReserved || booking}>
        <Text style={[styles.seatText, (isSelected || isReserved) && styles.seatTextInverted]}>
          {seat.seat_number}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundDarkLayer} />
      <View style={styles.backgroundBottomFade} />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Now Showing</Text>
          <Text style={styles.title}>{showtime.show_title}</Text>
          <Text style={styles.meta}>{formatShowDateTime(showtime.show_date, showtime.show_time)}</Text>
          <Text style={styles.meta}>Hall: {showtime.hall}</Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatChip}>
              <Text style={styles.heroStatValue}>{showtime.available_seats}</Text>
              <Text style={styles.heroStatLabel}>Available</Text>
            </View>
            <View style={styles.heroStatChip}>
              <Text style={styles.heroStatValue}>{showtime.reserved_seats}</Text>
              <Text style={styles.heroStatLabel}>Reserved</Text>
            </View>
            <View style={styles.heroStatChip}>
              <Text style={styles.heroStatValue}>{formatCurrency(showtime.price)}</Text>
              <Text style={styles.heroStatLabel}>Per seat</Text>
            </View>
          </View>
        </View>

        <View style={styles.legendCard}>
          <View style={styles.legendRow}>
            <View style={[styles.legendSwatch, styles.seatAvailable]} />
            <Text style={styles.legendText}>Available</Text>
            <View style={[styles.legendSwatch, styles.seatVipAvailable]} />
            <Text style={styles.legendText}>VIP</Text>
            <View style={[styles.legendSwatch, styles.seatSelected]} />
            <Text style={styles.legendText}>Selected</Text>
            <View style={[styles.legendSwatch, styles.seatReserved]} />
            <Text style={styles.legendText}>Reserved</Text>
          </View>
          <Text style={styles.vipHint}>
            VIP rows A-B: +{Math.round((vipMultiplier - 1) * 100)}%
          </Text>
          <View style={styles.stageLine}>
            <Text style={styles.stageText}>STAGE</Text>
          </View>
        </View>

        <View style={styles.seatGridCard}>
          <Text style={styles.gridTitle}>Choose Seats</Text>
          {seatRows.map((row, rowIndex) => {
            const blocks = splitIntoSeatBlocks(row.seats);
            const isVipRow = rowIndex < 2 && row.rowLabel !== '-';

            return (
              <View key={row.rowLabel} style={styles.seatRow}>
                <View style={styles.seatRowCenter}>
                  <View style={styles.seatBlock}>
                    {blocks.left.map((seat) => renderSeatButton(seat, isVipRow))}
                  </View>
                  <View style={styles.aisleSpacer} />
                  <View style={styles.seatBlock}>
                    {blocks.middle.map((seat) => renderSeatButton(seat, isVipRow))}
                  </View>
                  <View style={styles.aisleSpacer} />
                  <View style={styles.seatBlock}>
                    {blocks.right.map((seat) => renderSeatButton(seat, isVipRow))}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.selectionCard}>
          <Text style={styles.selectionInfo}>
            Selected seats ({selectedSeatNumbers.length}):{' '}
            {selectedSeatNumbers.length > 0 ? selectedSeatNumbers.join(', ') : 'None'}
          </Text>
          <Text style={styles.selectionMeta}>
            Normal: {normalSeatCount} x {formatCurrency(baseSeatPrice)}
          </Text>
          {vipSeatCount > 0 ? (
            <Text style={styles.selectionMeta}>
              VIP: {vipSeatCount} x {formatCurrency(vipSeatPrice)}
            </Text>
          ) : null}
          <Text style={styles.selectionTotal}>Total: {totalPrice}</Text>
          <TouchableOpacity
            style={[
              styles.clearSelectionButton,
              (booking || selectedSeatNumbers.length === 0) && styles.buttonDisabled
            ]}
            onPress={() => {
              setSelectedSeatNumbers([]);
            }}
            disabled={booking || selectedSeatNumbers.length === 0}>
            <Text style={styles.clearSelectionButtonText}>Clear selection</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, (booking || selectedSeatNumbers.length === 0) && styles.buttonDisabled]}
          onPress={handleReservation}
          disabled={booking || selectedSeatNumbers.length === 0}>
          <Text style={styles.buttonText}>{booking ? 'Booking...' : 'Book selected seats'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#101015'
  },
  backgroundDarkLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 10, 12, 0.48)'
  },
  backgroundBottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
    backgroundColor: 'rgba(9, 10, 12, 0.68)'
  },
  container: {
    padding: 16,
    paddingBottom: 28
  },
  loader: {
    marginTop: 32
  },
  centeredMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  heroCard: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 10,
    alignItems: 'center'
  },
  heroEyebrow: {
    color: '#efd8b3',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
    color: '#fff6ea',
    textAlign: 'center'
  },
  meta: {
    fontSize: 14,
    marginBottom: 2,
    color: '#dccbb4',
    textAlign: 'center'
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  heroStatChip: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  heroStatValue: {
    color: '#fff6ea',
    fontSize: 14,
    fontWeight: '800'
  },
  heroStatLabel: {
    color: '#f4e3c8',
    fontSize: 11
  },
  legendCard: {
    backgroundColor: 'rgba(24, 24, 28, 0.88)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    marginBottom: 10,
    ...cardShadow
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 2
  },
  legendText: {
    color: '#dccbb4',
    marginRight: 6,
    fontSize: 13
  },
  vipHint: {
    marginTop: 8,
    color: '#efd8b3',
    fontSize: 12,
    fontWeight: '700'
  },
  stageLine: {
    borderWidth: 1,
    borderColor: '#d7b889',
    borderRadius: 999,
    marginTop: 10,
    paddingVertical: 6
  },
  stageText: {
    color: '#f4e3c8',
    textAlign: 'center',
    letterSpacing: 0.8,
    fontWeight: '700',
    fontSize: 12
  },
  seatGridCard: {
    backgroundColor: 'rgba(24, 24, 28, 0.88)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    padding: 8,
    marginBottom: 10,
    ...cardShadow
  },
  gridTitle: {
    color: '#f2e3cf',
    fontWeight: '700',
    marginBottom: 10,
    marginLeft: 4
  },
  seatRow: {
    alignItems: 'center',
    marginBottom: 8
  },
  seatRowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  seatBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  aisleSpacer: {
    width: 16
  },
  seatButton: {
    width: 26,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center'
  },
  seatAvailable: {
    backgroundColor: 'rgba(68, 35, 80, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(182, 141, 205, 0.7)'
  },
  seatVipAvailable: {
    backgroundColor: 'rgba(212, 163, 79, 0.62)',
    borderWidth: 1,
    borderColor: '#f2d79e'
  },
  seatSelected: {
    backgroundColor: uiColors.primary,
    borderWidth: 1,
    borderColor: uiColors.primaryDark
  },
  seatVipSelected: {
    borderColor: '#f9e0a6',
    borderWidth: 1.5
  },
  seatReserved: {
    backgroundColor: 'rgba(128, 116, 140, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(191, 177, 201, 0.6)'
  },
  seatText: {
    color: '#fff6ea',
    fontWeight: '700',
    fontSize: 9
  },
  seatTextInverted: {
    color: '#fff'
  },
  selectionCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    padding: 12,
    marginBottom: 8
  },
  selectionInfo: {
    fontSize: 14,
    color: '#f0dcc1',
    marginBottom: 8
  },
  selectionMeta: {
    fontSize: 13,
    color: '#e9d7be',
    marginBottom: 4
  },
  selectionTotal: {
    fontSize: 16,
    color: '#fff6ea',
    fontWeight: '700'
  },
  clearSelectionButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: uiColors.buttonGhost,
    borderWidth: 1,
    borderColor: uiColors.buttonGhostBorder,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  clearSelectionButtonText: {
    color: uiColors.heroText,
    fontWeight: '700',
    fontSize: 12
  },
  button: {
    backgroundColor: uiColors.primary,
    borderRadius: 999,
    paddingVertical: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: uiColors.primaryDark,
    ...cardShadow
  },
  buttonDisabled: {
    opacity: 0.65
  },
  buttonText: {
    color: uiColors.buttonPrimaryText,
    textAlign: 'center',
    fontWeight: '800'
  },
  errorText: {
    fontSize: 16,
    color: '#ffb8b8'
  }
});
