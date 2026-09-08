import { HStack } from "@/src/components/ui/hstack";
import { InputField } from "@/src/components/ui/input";
import { Text } from "@/src/components/ui/text";
import { useState } from "react";
import TextField from "../../atoms/TextField/TextField";
import { styles } from "./index.styles";

interface Props {
    inputProps?: React.ComponentProps<typeof InputField>;
}

function TimeField({ inputProps }: Props) {
    const [hours, setHours] = useState('');
    const [minutes, setMinutes] = useState('');

    const handleHoursChange = (value: string) => {
        const formatted = value.replace(/[^0-9]/g, '').slice(0, 2);
        if(Number(formatted) <= 23) setHours(formatted);
    }

    const handleMinutesChange = (value: string) => {
        const formatted = value.replace(/[^0-9]/g, '').slice(0, 2);
        if(Number(formatted) <= 59) setMinutes(formatted);
    }

    return (
        <HStack style={styles.hstack} space="sm" >
            <TextField placeholder="HH" style={styles.textField} inputProps={{ ...inputProps, value: hours, onChangeText: handleHoursChange }} />
            <Text>:</Text>
            <TextField placeholder="MM" style={styles.textField} inputProps={{ ...inputProps, value: minutes, onChangeText: handleMinutesChange }} />
        </HStack>
    );
}

export default TimeField;