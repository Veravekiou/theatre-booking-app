import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { cardShadow, uiColors } from '../../constants/ui';
import { getErrorMessage } from '../../utils/errorMessage';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters';

type Showtime = {
  showtime_id: number;
  show_id: number;
  show_title: string;
  duration: number;
  age_rating: string | null;
  theatre_name: string;
  theatre_location: string;
  show_date: string;
  show_time: string;
  hall: string;
  price: number;
  available_seats: number;
};

type VenueOption = {
  key: string;
  label: string;
};

const getSingleParam = (value?: string | string[]) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const getVenueKey = (item: Showtime) => `${item.theatre_name}||${item.theatre_location}`;

const normalizeDateKey = (dateValue: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateValue.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
};

const toDateFromKey = (dateKey: string) => {
  const normalized = normalizeDateKey(dateKey);
  if (!normalized) {
    return null;
  }

  const [year, month, day] = normalized.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatWeekday = (dateValue: string) => {
  const date = toDateFromKey(dateValue);
  if (!date || Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
};

const formatDayNumber = (dateValue: string) => {
  const date = toDateFromKey(dateValue);
  if (!date || Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat('en-US', { day: '2-digit' }).format(date);
};

export default function ShowtimesScreen() {
  const params = useLocalSearchParams<{
    showId?: string | string[];
    title?: string | string[];
  }>();

  const incomingShowId = (getSingleParam(params.showId) || '').trim();
  const incomingTitle = (getSingleParam(params.title) || '').trim();

  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [selectedVenueKey, setSelectedVenueKey] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchShowtimes = async () => {
      if (!incomingShowId && !incomingTitle) {
        setShowtimes([]);
        setErrorMessage('Open this page from a show card.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage('');
        const response = await api.get('/showtimes', {
          params: {
            showId: incomingShowId || undefined,
            title: incomingTitle || undefined
          }
        });

        setShowtimes(response.data || []);
      } catch (error: unknown) {
        setShowtimes([]);
        setErrorMessage(getErrorMessage(error, 'Failed to load showtimes.'));
      } finally {
        setLoading(false);
      }
    };

    fetchShowtimes();
  }, [incomingShowId, incomingTitle]);

  const availableShowtimes = useMemo(
    () => showtimes.filter((item) => item.available_seats > 0),
    [showtimes]
  );

  const venueOptions = useMemo<VenueOption[]>(() => {
    const map = new Map<string, VenueOption>();

    availableShowtimes.forEach((item) => {
      const key = getVenueKey(item);
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: `${item.theatre_name} - ${item.theatre_location}`
        });
      }
    });

    return Array.from(map.values());
  }, [availableShowtimes]);

  useEffect(() => {
    if (venueOptions.length === 0) {
      setSelectedVenueKey('');
      return;
    }

    if (!selectedVenueKey || !venueOptions.some((item) => item.key === selectedVenueKey)) {
      setSelectedVenueKey(venueOptions[0].key);
    }
  }, [selectedVenueKey, venueOptions]);

  const filteredByVenue = useMemo(() => {
    if (!selectedVenueKey) {
      return availableShowtimes;
    }

    return availableShowtimes.filter((item) => getVenueKey(item) === selectedVenueKey);
  }, [availableShowtimes, selectedVenueKey]);

  const dateOptions = useMemo(() => {
    const dates = new Set<string>();
    filteredByVenue.forEach((item) => {
      const normalized = normalizeDateKey(item.show_date);
      if (normalized) {
        dates.add(normalized);
      }
    });
    return Array.from(dates).sort((a, b) => a.localeCompare(b));
  }, [filteredByVenue]);

  useEffect(() => {
    if (dateOptions.length === 0) {
      setSelectedDate('');
      return;
    }

    if (!selectedDate || !dateOptions.includes(selectedDate)) {
      setSelectedDate(dateOptions[0]);
    }
  }, [dateOptions, selectedDate]);

  const timeOptions = useMemo(() => {
    if (!selectedDate) {
      return [] as Showtime[];
    }

    const bySlot = new Map<string, Showtime>();

    filteredByVenue
      .filter((item) => normalizeDateKey(item.show_date) === selectedDate)
      .sort((a, b) => a.show_time.localeCompare(b.show_time))
      .forEach((item) => {
        const key = `${item.show_time}|${item.hall}`;
        const current = bySlot.get(key);

        if (!current || item.available_seats > current.available_seats) {
          bySlot.set(key, item);
        }
      });

    return Array.from(bySlot.values()).sort((a, b) => a.show_time.localeCompare(b.show_time));
  }, [filteredByVenue, selectedDate]);

  useEffect(() => {
    if (timeOptions.length === 0) {
      setSelectedShowtimeId(null);
      return;
    }

    if (!timeOptions.some((item) => item.showtime_id === selectedShowtimeId)) {
      setSelectedShowtimeId(timeOptions[0].showtime_id);
    }
  }, [selectedShowtimeId, timeOptions]);

  const selectedShowtime =
    timeOptions.find((item) => item.showtime_id === selectedShowtimeId) || null;

  const fallbackShowtime = selectedShowtime || availableShowtimes[0] || showtimes[0] || null;
  const showTitle = fallbackShowtime?.show_title || incomingTitle || 'Show';
  const showDuration = fallbackShowtime?.duration || 0;
  const showAge = fallbackShowtime?.age_rating || 'All ages';
  const selectedVenueLabel =
    venueOptions.find((item) => item.key === selectedVenueKey)?.label ||
    `${fallbackShowtime?.theatre_name || ''} - ${fallbackShowtime?.theatre_location || ''}`.trim();

  const canSelectSeats = Boolean(selectedShowtime && selectedShowtime.available_seats > 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#fff" style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (errorMessage) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredMessage}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              router.back();
            }}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (showtimes.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredMessage}>
          <Text style={styles.emptyText}>No showtimes available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (availableShowtimes.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredMessage}>
          <Text style={styles.emptyText}>No available showtimes for this show right now.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundDarkLayer} />
      <View style={styles.backgroundBottomFade} />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Now Showing</Text>
          <Text style={styles.heroTitle}>{showTitle}</Text>
          <Text style={styles.heroVenue}>{selectedVenueLabel}</Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaChip}>
              <Text style={styles.heroMetaChipText}>{showAge}</Text>
            </View>
            <View style={styles.heroMetaChip}>
              <Text style={styles.heroMetaChipText}>{showDuration} min</Text>
            </View>
            {selectedShowtime ? (
              <View style={styles.heroMetaChip}>
                <Text style={styles.heroMetaChipText}>{formatCurrency(selectedShowtime.price)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {venueOptions.length > 1 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Choose Location</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.optionRow}>
              {venueOptions.map((option) => {
                const active = option.key === selectedVenueKey;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.locationChip, active && styles.locationChipActive]}
                    onPress={() => {
                      setSelectedVenueKey(option.key);
                    }}>
                    <Text style={[styles.locationChipText, active && styles.locationChipTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Choose Date</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.optionRow}>
            {dateOptions.map((dateValue) => {
              const active = selectedDate === dateValue;
              return (
                <TouchableOpacity
                  key={dateValue}
                  style={[styles.dateChip, active && styles.dateChipActive]}
                  onPress={() => {
                    setSelectedDate(dateValue);
                  }}>
                  <Text style={[styles.dateChipDayName, active && styles.dateChipTextActive]}>
                    {formatWeekday(dateValue)}
                  </Text>
                  <Text style={[styles.dateChipDayNumber, active && styles.dateChipTextActive]}>
                    {formatDayNumber(dateValue)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Choose Time</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.optionRow}>
            {timeOptions.map((item) => {
              const active = selectedShowtimeId === item.showtime_id;
              return (
                <TouchableOpacity
                  key={item.showtime_id}
                  style={[styles.timeChip, active && styles.timeChipActive]}
                  onPress={() => {
                    setSelectedShowtimeId(item.showtime_id);
                  }}>
                  <Text style={[styles.timeChipMain, active && styles.timeChipTextActive]}>
                    {formatTime(item.show_time)}
                  </Text>
                  <Text style={[styles.timeChipSub, active && styles.timeChipTextActive]}>
                    {item.hall}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {selectedShowtime ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLine}>{formatDate(selectedDate)}</Text>
            <Text style={styles.summaryLine}>
              {formatTime(selectedShowtime.show_time)} - {selectedShowtime.hall}
            </Text>
            <Text style={styles.summaryLine}>
              {selectedShowtime.available_seats} seats available
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.selectSeatsButton, !canSelectSeats && styles.selectSeatsButtonDisabled]}
          disabled={!canSelectSeats}
          onPress={() => {
            if (!selectedShowtime) {
              return;
            }

            router.push(`/showtimes/${selectedShowtime.showtime_id}`);
          }}>
          <Text style={styles.selectSeatsButtonText}>
            {canSelectSeats ? 'Select Seats' : 'No Seats Available'}
          </Text>
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
    paddingBottom: 30
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
  errorText: {
    color: '#ffb8b8',
    textAlign: 'center',
    marginBottom: 12
  },
  emptyText: {
    color: '#f4e3cf',
    textAlign: 'center'
  },
  backButton: {
    backgroundColor: uiColors.buttonGhost,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: uiColors.buttonGhostBorder
  },
  backButtonText: {
    color: uiColors.heroText,
    fontWeight: '700'
  },
  heroCard: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 12,
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
  heroTitle: {
    color: '#fff6ea',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 38,
    textAlign: 'center'
  },
  heroVenue: {
    color: '#dccbb4',
    marginTop: 6,
    marginBottom: 10,
    textAlign: 'center'
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  heroMetaChip: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  heroMetaChipText: {
    color: '#fff6ea',
    fontWeight: '700',
    fontSize: 12
  },
  sectionCard: {
    backgroundColor: 'rgba(24, 24, 28, 0.88)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    padding: 12,
    marginBottom: 12,
    ...cardShadow
  },
  sectionTitle: {
    color: '#f2e3cf',
    fontWeight: '700',
    marginBottom: 8,
    fontSize: 15
  },
  optionRow: {
    gap: 8
  },
  locationChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(68, 35, 80, 0.45)',
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  locationChipActive: {
    borderColor: uiColors.primaryDark,
    backgroundColor: uiColors.primary,
    ...cardShadow
  },
  locationChipText: {
    color: '#f2dfcb',
    fontWeight: '600'
  },
  locationChipTextActive: {
    color: '#fff'
  },
  dateChip: {
    width: 68,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(68, 35, 80, 0.45)',
    paddingVertical: 10,
    alignItems: 'center'
  },
  dateChipActive: {
    borderColor: uiColors.primaryDark,
    backgroundColor: uiColors.primary,
    ...cardShadow
  },
  dateChipDayName: {
    color: '#dbc6d8',
    fontSize: 13,
    marginBottom: 3
  },
  dateChipDayNumber: {
    color: '#fff6ea',
    fontSize: 18,
    fontWeight: '800'
  },
  dateChipTextActive: {
    color: '#fff'
  },
  timeChip: {
    minWidth: 100,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(68, 35, 80, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center'
  },
  timeChipActive: {
    borderColor: uiColors.primaryDark,
    backgroundColor: uiColors.primary,
    ...cardShadow
  },
  timeChipMain: {
    color: '#fff6ea',
    fontSize: 20,
    fontWeight: '800'
  },
  timeChipSub: {
    color: '#dbc6d8',
    fontSize: 12,
    marginTop: 2
  },
  timeChipTextActive: {
    color: '#fff'
  },
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    padding: 12,
    marginBottom: 12
  },
  summaryLine: {
    color: '#f0dcc1',
    marginBottom: 2
  },
  selectSeatsButton: {
    backgroundColor: uiColors.primary,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: uiColors.primaryDark,
    ...cardShadow
  },
  selectSeatsButtonDisabled: {
    opacity: 0.55
  },
  selectSeatsButtonText: {
    textAlign: 'center',
    color: uiColors.buttonPrimaryText,
    fontWeight: '800',
    letterSpacing: 0.2
  }
});
