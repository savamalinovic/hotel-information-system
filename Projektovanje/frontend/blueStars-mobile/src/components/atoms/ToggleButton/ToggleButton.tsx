import { Switch } from "@/src/components/ui/switch";
import { Colors } from "@/src/styles/style";

interface Props {
    size?: 'sm' | 'md' | 'lg';
    isDisabled?: boolean;
    isInvalid?: boolean;
    isRequired?: boolean;
    isHovered?: boolean;
    value?: boolean;
    defaultValue?: boolean;
    onToggle: () => any;

    trackColor?: { false: string, true: string };
    thumbColor?: string;
    ios_backgroundColor?: string;
}

/**
 * A customizable on/off switch component built on top of the GlueStack `Switch`.
 * Typically used for binary options such as enabling or disabling features,
 * toggling settings, or activating preferences.
 * 
 * Additionally, it provides platform-specific styling (e.g. `ios_backgroundColor`)
 * and full control over track and thumb colors.
 *
 * @param {Object} props - The component props.
 * @param {'sm' | 'md' | 'lg'} [props.size='md'] - The visual size of the switch.
 * @param {boolean} [props.isDisabled=false] - Disables user interaction.
 * @param {boolean} [props.isInvalid=false] - Indicates an invalid state (used for validation feedback).
 * @param {boolean} [props.isRequired=false] - Marks the switch as required.
 * @param {boolean} [props.isHovered=false] - Applies hover state styling (for web contexts).
 * @param {boolean} [props.value=false] - The current boolean state of the switch.
 * @param {boolean} [props.defaultValue=false] - The initial value before user interaction.
 * @param {() => any} props.onToggle - Callback fired when the toggle value changes.
 * @param {{ false: string, true: string }} [props.trackColor={ false: Colors.secondary, true: Colors.primary }] - Custom colors for the switch track (off/on states).
 * @param {string} [props.thumbColor=Colors.background] - Color of the switch thumb.
 * @param {string} [props.ios_backgroundColor=Colors.secondary] - iOS-specific background color when the switch is off.
 * @returns {JSX.Element} A customizable toggle switch component.
 *
 * @example
 * ```tsx
 * const [enabled, setEnabled] = useState(false);
 *
 * <ToggleButton
 *   value={enabled}
 *   onToggle={() => setEnabled(!enabled)}
 *   size="lg"
 * />
 * ```
 */
function ToggleButton({
    size = 'md',
    isDisabled = false,
    isInvalid = false,
    isRequired = false,
    isHovered = false,
    value = false,
    defaultValue = false,
    onToggle,

    // TODO: vidjeti kako rade GlueStack var boje iz config.ts!
    trackColor = { 
        false: Colors.secondary, 
        true: Colors.primary
    },
    thumbColor = Colors.background,
    ios_backgroundColor = Colors.secondary,
}: Props) {
    return(
        <Switch
            size={size}
            isDisabled={isDisabled}
            isInvalid={isInvalid}
            isHovered={isHovered}
            value={value}
            defaultValue={defaultValue}
            onToggle={onToggle}
            
            trackColor={trackColor}
            thumbColor={thumbColor}
            ios_backgroundColor={ios_backgroundColor}
        />
    );
}

export default ToggleButton;