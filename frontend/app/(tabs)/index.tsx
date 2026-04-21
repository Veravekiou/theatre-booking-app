import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { router } from 'expo-router';
import api from '../../services/api';
import { cardShadow, uiColors } from '../../constants/ui';
import { getErrorMessage } from '../../utils/errorMessage';

type Show = {
  show_id: number;
  title: string;
  description: string;
  duration: number;
  age_rating: string | null;
  theatre_name: string;
  theatre_location: string;
};

const CAROUSEL_CARD_WIDTH = 102;
const CAROUSEL_CARD_HEIGHT = 150;
const CAROUSEL_GAP = 12;

const hamletPoster = require('../../assets/images/posters/hamlet-1990-original-movie-poster-buy-now-at-starstills__84797.jpg');
const antigonePoster = require('../../assets/images/posters/ptheo16-antigone-theater-poster-777x1200.webp');
const lysistrataPoster = require('../../assets/images/posters/aristophanes-lysistrata-at-sidewalks-theatre-poster-or-unknown-artistproduct-type_2400x.webp');
const godotPoster = require('../../assets/images/posters/godot.jpg');
const frogsPoster = require('../../assets/images/posters/s-l1200.jpg');
const bacchaePoster = require('../../assets/images/posters/NTGDS_AW_Bacchae_TodayTix_logo_480_x_720.jpg');
const electraPoster = require('../../assets/images/posters/2098.jpg')
const medeaPoster = require('../../assets/images/posters/11x17_medea_poster-scaled.jpg');
const oedipusPoster = require('../../assets/images/posters/16f714fb225b7968c5eea461de65b6d9.jpg');

const getPosterSource = (show: Show): ImageSourcePropType => {
  const normalizedTitle = show.title.trim().toLowerCase();

  if (normalizedTitle.includes('hamlet')) {
    return hamletPoster;
  }

  if (normalizedTitle.includes('antigone')) {
    return antigonePoster;
  }

  if (normalizedTitle.includes('lysistrata')) {
    return lysistrataPoster;
  }

  if (normalizedTitle.includes('godot')) {
    return godotPoster;
  }

  if (normalizedTitle.includes('frogs')) {
    return frogsPoster;
  }

  if (normalizedTitle.includes('bacchae')) {
    return bacchaePoster;
  }

  if (normalizedTitle.includes('electra'))  {
    return electraPoster;
  }

  if (normalizedTitle.includes('medea')) {
    return medeaPoster;
  }

  if (normalizedTitle.includes('oedipus')) {
    return oedipusPoster;
  }


  return {
    uri: `https://source.unsplash.com/900x1400/?theatre,stage,${encodeURIComponent(
      show.theatre_name
    )}&sig=${show.show_id}`
  };
};

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const sidePadding = Math.max(16, (width - CAROUSEL_CARD_WIDTH) / 2);
  const snapInterval = CAROUSEL_CARD_WIDTH + CAROUSEL_GAP;

  const [shows, setShows] = useState<Show[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const carouselRef = useRef<FlatList<Show>>(null);

  useEffect(() => {
    fetchShows();
  }, []);

  const fetchShows = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const response = await api.get('/shows');
      setShows(response.data || []);
    } catch (error: unknown) {
      setShows([]);
      setErrorMessage(getErrorMessage(error, 'Failed to load shows.'));
    } finally {
      setLoading(false);
    }
  };

  const filteredShows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return shows;
    }

    return shows.filter((item) =>
      [item.title, item.theatre_name, item.theatre_location]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [shows, searchQuery]);

  useEffect(() => {
    if (!filteredShows.length) {
      setActiveIndex(0);
      return;
    }

    if (activeIndex > filteredShows.length - 1) {
      setActiveIndex(0);
      carouselRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [activeIndex, filteredShows.length]);

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!filteredShows.length) {
      return;
    }

    const rawIndex = Math.round(event.nativeEvent.contentOffset.x / snapInterval);
    const nextIndex = Math.max(0, Math.min(rawIndex, filteredShows.length - 1));
    setActiveIndex(nextIndex);
  };

  const activeShow = filteredShows[activeIndex];

  return (
    <SafeAreaView style={styles.safeArea}>
      {activeShow ? (
        <ImageBackground
          source={getPosterSource(activeShow)}
          style={styles.backgroundPoster}
          imageStyle={styles.backgroundPosterImage}
        />
      ) : (
        <View style={styles.backgroundFallback} />
      )}

      <View style={styles.backgroundDarkLayer} />
      <View style={styles.backgroundBottomFade} />

      <View style={styles.container}>
        <View style={styles.searchBar}>
          <Text style={styles.appTitle}>theaterBookingApp</Text>
          <View style={styles.searchBarRow}>
            <TextInput
              placeholder="Search shows, theatre, location"
              placeholderTextColor="#d0c3b0"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => {
                router.push('/(tabs)/profile');
              }}>
              <Text style={styles.profileButtonText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={styles.loader} />
        ) : errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : filteredShows.length === 0 ? (
          <Text style={styles.emptyText}>No shows match your search.</Text>
        ) : activeShow ? (
          <>
            <View style={styles.centerContent}>
              <Text style={styles.centerEyebrow}>NOW SHOWING</Text>
              <Text style={styles.centerTitle}>{activeShow.title}</Text>
              <Text style={styles.centerMeta}>
                {activeShow.theatre_name} - {activeShow.theatre_location}
              </Text>
              <View style={styles.infoChipsRow}>
                <View style={styles.infoChip}>
                  <Text style={styles.infoChipText}>{activeShow.duration} min</Text>
                </View>
                <View style={styles.infoChip}>
                  <Text style={styles.infoChipText}>{activeShow.age_rating || 'All ages'}</Text>
                </View>
              </View>
              <Text style={styles.centerDescription} numberOfLines={2}>
                {activeShow.description || 'A standout stage production now playing.'}
              </Text>
              <TouchableOpacity
                style={styles.buyButton}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/explore',
                    params: {
                      showId: String(activeShow.show_id),
                      title: activeShow.title
                    }
                  })
                }>
                <Text style={styles.buyButtonText}>Buy Tickets</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.carouselDock}>
              <FlatList
                ref={carouselRef}
                data={filteredShows}
                horizontal
                keyExtractor={(item) => item.show_id.toString()}
                showsHorizontalScrollIndicator={false}
                snapToInterval={snapInterval}
                decelerationRate="fast"
                disableIntervalMomentum
                contentContainerStyle={[styles.carouselContent, { paddingHorizontal: sidePadding }]}
                ItemSeparatorComponent={() => <View style={{ width: CAROUSEL_GAP }} />}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={[
                      styles.carouselCard,
                      activeShow.show_id === item.show_id && styles.carouselCardActive
                    ]}
                    onPress={() => {
                      setActiveIndex(index);
                      carouselRef.current?.scrollToOffset({
                        offset: index * snapInterval,
                        animated: true
                      });
                    }}>
                    <ImageBackground
                      source={getPosterSource(item)}
                      style={styles.carouselCardImage}
                      imageStyle={styles.carouselCardImageInner}
                    />
                  </TouchableOpacity>
                )}
              />
            </View>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#101015'
  },
  backgroundPoster: {
    ...StyleSheet.absoluteFillObject
  },
  backgroundPosterImage: {
    resizeMode: 'cover'
  },
  backgroundFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1b1521'
  },
  backgroundDarkLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 10, 12, 0.6)'
  },
  backgroundBottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '28%',
    backgroundColor: 'rgba(9, 10, 12, 0.72)'
  },
  container: {
    flex: 1,
    justifyContent: 'space-between'
  },
  searchBar: {
    paddingHorizontal: 16,
    paddingTop: 8
  },
  appTitle: {
    color: '#fff6ea',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: 0.4
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(24, 24, 28, 0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: '#fff7ec',
    ...cardShadow
  },
  profileButton: {
    backgroundColor: 'rgba(255,246,231,0.12)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,246,231,0.18)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...cardShadow
  },
  profileButtonText: {
    color: uiColors.heroText,
    fontWeight: '700'
  },
  loader: {
    marginTop: 32
  },
  errorText: {
    textAlign: 'center',
    color: '#ffd7d7',
    marginTop: 24,
    paddingHorizontal: 16
  },
  emptyText: {
    textAlign: 'center',
    color: '#f4e3cf',
    marginTop: 24,
    paddingHorizontal: 16
  },
  centerContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 28,
    marginHorizontal: 18,
    paddingVertical: 22,
    borderRadius: 24,
    backgroundColor: 'rgba(11, 12, 15, 0.34)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)'
  },
  centerEyebrow: {
    color: '#f2debe',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8
  },
  centerTitle: {
    color: '#fff6ea',
    fontSize: 42,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 44,
    textShadowColor: 'rgba(0, 0, 0, 0.42)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 14
  },
  centerMeta: {
    color: '#f1ddc1',
    marginTop: 8,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.34)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10
  },
  infoChipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12
  },
  infoChip: {
    backgroundColor: 'rgba(16, 17, 20, 0.58)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)'
  },
  infoChipText: {
    color: '#f6e8d3',
    fontSize: 12,
    fontWeight: '700'
  },
  centerDescription: {
    color: '#e6d4ba',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 320,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8
  },
  buyButton: {
    marginTop: 16,
    backgroundColor: uiColors.primary,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: uiColors.primaryDark,
    ...cardShadow
  },
  buyButtonText: {
    color: uiColors.buttonPrimaryText,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  carouselDock: {
    paddingBottom: 22
  },
  carouselContent: {
    alignItems: 'center'
  },
  carouselCard: {
    width: CAROUSEL_CARD_WIDTH,
    height: CAROUSEL_CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    opacity: 0.6
  },
  carouselCardActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: uiColors.primary,
    transform: [{ scale: 1.05 }]
  },
  carouselCardImage: {
    flex: 1
  },
  carouselCardImageInner: {
    borderRadius: 14
  }
});
