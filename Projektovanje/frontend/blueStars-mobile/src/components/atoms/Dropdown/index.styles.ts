/*
{** Popravljeno pozicioniranje strelice (top: 4) da ne viri iz polja i malo sam podesila padding
 u placeholderu da tekst bolje 'sjedi' unutra. Sada je sve centrirano. by Nikolina **}
*/

import { Colors } from '@/src/styles/style';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    dropdownContainer: {
        marginBottom: 0,
        borderRadius: 10,
        borderColor: Colors.tertiary,
        borderWidth: 1.2
    },
    dropdown: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        minHeight: 48,
        backgroundColor: 'white',
    },
    placeholder: {
        fontSize: 15,
        color: '#6b7280',
        textAlign: 'left',
        paddingTop: 2,
        paddingLeft:6,
        paddingBottom:2,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: Colors.primary,
        textAlign: 'left',
       
    },
    dropdownIcon: {
        top: 4, // KORIGOVANO: Vertikalno centriranje ikone (48px polje - 20px ikona = 28px/2 = 14px)
        right: 12,
        
    },
    modalContainer: {
        padding: 16,
        backgroundColor: 'white',
    },
});