import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
// import { Colors } from "@/src/styles/style";
import { useTheme } from '@/src/providers/ThemeProvider';

type SegmentedControlProps = {
  options: string[];
  selectedOption: string;
  onOptionPress?: (option: string) => void;
};

const SegmentedControl: React.FC<SegmentedControlProps> = React.memo(
  ({ options, selectedOption, onOptionPress }) => {
    const { Colors } = useTheme();
    const { width: windowWidth } = useWindowDimensions();

    const internalPadding = 20;
    const segmentedControlWidth = windowWidth - 40;

    const itemWidth =
      (segmentedControlWidth - internalPadding) / options.length;

    const rStyle = useAnimatedStyle(() => {
      return {
        left: withTiming(
          itemWidth * options.indexOf(selectedOption) + internalPadding / 2,
          { duration: 200 }
        ),
      };
    }, [selectedOption, options, itemWidth]);

    const styles = getStyles(Colors);

    return (
      <View
        style={[
          styles.container,
          {
            width: segmentedControlWidth,
            borderRadius: 20,
            paddingLeft: internalPadding / 2,
          },
        ]}
      >
        <Animated.View
          style={[
            {
              width: itemWidth,
            },
            rStyle,
            styles.activeBox,
          ]}
        />
        {options.map((option) => {
          const isSelected = option === selectedOption;
          return (
            <TouchableOpacity
              onPress={() => onOptionPress?.(option)}
              key={option}
              style={[
                {
                  width: itemWidth,
                },
                styles.labelContainer,
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.label,
                  isSelected && styles.activeLabel,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }
);

SegmentedControl.displayName = 'SegmentedControl';

const getStyles = (Colors: any) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      height: 36,
      backgroundColor: Colors.secondary,
	  borderColor: '#EDEDED',
	  borderWidth: 1,
    },
    activeBox: {
      position: 'absolute',
      borderRadius: 100,
      shadowColor: Colors.shadowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.1,
      elevation: 3,
      height: '80%',
      top: '10%',
      backgroundColor: Colors.background,
    },
    labelContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    label: {
      fontSize: 13,
      color: Colors.textSecondary,
      fontWeight: '400',
    },
    activeLabel: {
      color: Colors.textPrimary,
      fontWeight: '600',
    },
  });

export { SegmentedControl };
