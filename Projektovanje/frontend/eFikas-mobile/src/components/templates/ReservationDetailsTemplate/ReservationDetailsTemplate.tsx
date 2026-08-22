import React from 'react';
import { ScrollView, View, ScrollViewProps, Text } from 'react-native';
import styles from './index.styles';
import { useTheme } from "@/src/providers/ThemeProvider";

export type ReservationDetailsTemplateProps = {
    headerCard: React.ReactNode;
    infoItems: React.ReactNode[];
    noteHeader: React.ReactNode;
    noteBody: React.ReactNode;
    primaryAction?: React.ReactNode;
    scrollProps?: ScrollViewProps;
};

const ReservationDetailsTemplate: React.FC<ReservationDetailsTemplateProps> = ({
    headerCard,
    infoItems,
    noteHeader,
    noteBody,
    primaryAction,
    scrollProps
}) => {
    const { Colors } = useTheme();
    return (
        // <View style={styles.root}>
        <View style={[styles.root, { backgroundColor: Colors.screenBackground }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                {...scrollProps}
            >
                <View style={styles.section}>
                    <View style={styles.headerCardWrapper}>{headerCard}</View>
                </View>

                <View style={styles.section}>
                    <View style={styles.infoGrid}>
                        {infoItems.map((item, index) => (
                            <View key={index} style={styles.infoItem}>
                                {item}
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.noteHeaderWrapper}>{noteHeader}</View>
                    <View style={styles.noteBodyWrapper}>{noteBody}</View>
                </View>

                {primaryAction ? (
                    <View style={styles.section}>
                        <View style={styles.primaryActionWrapper}>{primaryAction}</View>
                    </View>
                ) : null}
            </ScrollView>
        </View>
    );
};

export default ReservationDetailsTemplate;
