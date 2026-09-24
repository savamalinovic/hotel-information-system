import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Label } from '@/src/components/atoms/Label/Label';
import { IconButton } from '@/src/components/atoms/IconButton/IconButton';
import { useTheme } from '@/src/providers/ThemeProvider';
import { Icon } from '../../atoms/Icon/Icon';

interface SectionHeaderProps {
  title: string;
  onPress: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, onPress }) => {
  const { Colors } = useTheme();

  return (
    <TouchableOpacity 
        onPress={onPress} style={styles.container}>
      <Label 
        text={title} 
        align="left" 
        size="xl" 
        color={Colors.textPrimary} 
        className="font-semibold"
      />
      <View style={[{width: 10}]} />
      <Icon
        name="ChevronRight"
        color={Colors.primary}
        size = {24}
        strokeWidth = {2}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%'
  },
});