// index.styles.ts
import { StyleSheet } from 'react-native';

export const getStyles = (Colors: any) =>
  StyleSheet.create({
    imageRow: {
      flexDirection: 'row',
      gap: 12,
    },
    pressable: {
      flex: 1,
    },
    imageContainer: {
      aspectRatio: 1,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: Colors.secondary,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    overlayText: {
      color: Colors.textLight,
      fontSize: 26,
      fontWeight: '600',
    },
    modalContent: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    modalImage: {
      width: '100%',
    },
    modalCloseButton: {
      position: 'absolute',
      top: 50,
      right: 20,
      zIndex: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      borderRadius: 18,
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    arrowButton: {
      position: 'absolute',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 5,
    },
    arrowLeft: {
      left: 15,
    },
    arrowRight: {
      right: 15,
    },
  });