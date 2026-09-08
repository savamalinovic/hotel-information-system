import { Icon } from "@/src/components/atoms/Icon/Icon";
import { Input, InputField, InputSlot } from "@/src/components/ui/input";
import { LucideIconName } from "@/src/types/types";
import { GestureResponderEvent, StyleProp, ViewStyle } from "react-native";

interface Props {
    size?: "xl" | "lg" | "md" | "sm";
    variant?: "underlined" | "outline" | "rounded";
    type?: "text" | "password";
    placeholder?: string;
    iconName?: LucideIconName;
    iconLocation?: 'left' | 'right' | 'absent';
    style?: StyleProp<ViewStyle>;
    inputProps?: React.ComponentProps<typeof InputField>;
    rightElement?: React.ReactNode;
    isInvalid?: boolean;
    isDisabled?: boolean;
    isHovered?: boolean;
    isFocused?: boolean;
    isRequired?: boolean;
    isOutline?: boolean;
    onPress?: (e: GestureResponderEvent) => void;
}

/**
 * TextField component
 *
 * A customizable input field that supports multiple sizes, visual variants,
 * optional icons, and additional input state props.  
 * 
 * It acts as a wrapper around the base `Input` and `InputField` components,
 * allowing consistent styling and layout of text inputs throughout the app.
 *
 * Features:
 * - Supports variants: `"underlined"`, `"outline"`, and `"rounded"`.
 * - Optional left or right icon (using Lucide icons).
 * - Handles common input states (invalid, disabled, hovered, focused, required).
 * - Can be extended with `inputProps` for native input customization.
 *
 * @param {Props} props - The properties for the TextField component.
 * @returns {JSX.Element} A styled text input element with optional icon and state handling.
 */
function TextField({ 
    size = "md", 
    variant = "outline", 
    type,
    placeholder,
    iconName,
    iconLocation = 'absent',
    style,
    inputProps,
    rightElement,
    isInvalid, 
    isDisabled, 
    isHovered, 
    isFocused, 
    isRequired, 
    isOutline,
    onPress
}: Props) {

    const IconElement = iconName ? (
        <InputSlot className="pl-3"  >
            <Icon name={iconName} />
        </InputSlot>
    ) : null;
    
    return(
        <Input
            style={style}
            size={size} 
            variant={variant} 
            isInvalid={isInvalid} 
            isDisabled={isDisabled}
            isHovered={isHovered}
            isFocused={isFocused}
            isRequired={isRequired}
        >
            {/* Left Icon */}
            {iconLocation === "left" && IconElement}

            {/* Main Input */}
            <InputField type={type} placeholder={placeholder} {...inputProps} />

            {/* Right Icon (if type === password toggle) */}
            {iconLocation === "right" && IconElement}

            {/* Custom Right Element (e.g., eye/eye-off for password toggle) */}
            {rightElement && <InputSlot className="pr-3">{rightElement}</InputSlot>}
        </Input>
    );
}

export default TextField;