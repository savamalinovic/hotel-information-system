import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ImageBackground,
  ImageSourcePropType
} from 'react-native';
import { Colors } from '@/src/styles/style';

export type WelcomeScreenTemplateProps = {
  backgroundSource: ImageSourcePropType;
  logo: React.ReactNode;
  primaryButton: React.ReactNode;
};

const screenHeight = Dimensions.get('window').height;

const WelcomeScreenTemplate: React.FC<WelcomeScreenTemplateProps> = ({
  backgroundSource,
  logo,
  primaryButton
}) => {
  return (
    <View style={styles.root}>
      <ImageBackground
        source={backgroundSource}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <View style={styles.content}>
          <View style={styles.logoWrapper}>{logo}</View>
          <View style={styles.bottomWrapper}>{primaryButton}</View>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.shadowColor
  },
  backgroundImage: {
    flex: 1
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)'
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: screenHeight * 0.08,
    paddingBottom: screenHeight * 0.05,
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logoWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  bottomWrapper: {
    width: '100%',
    alignItems: 'center'
  }
});

export default WelcomeScreenTemplate;
