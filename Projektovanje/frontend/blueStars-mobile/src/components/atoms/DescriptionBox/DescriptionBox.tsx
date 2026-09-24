import { Textarea, TextareaInput } from "@/src/components/ui/textarea";

interface Props {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    isInvalid?: boolean;
    isDisabled?: boolean;
    isHovered?: boolean;
    isFocused?: boolean;
    isRequired?: boolean;
    isReadOnly?: boolean;
    placeholder?: string;
	value?: string;
    onChangeText?: (text: string) => void;
}

/**
 * A multi-line text input field for entering longer text content such as
 * descriptions, comments, or notes.  
 * 
 *
 * @param {Object} props - The component props.
 * @param {'sm' | 'md' | 'lg' | 'xl'} [props.size='md'] - The overall size of the textarea.
 * @param {boolean} [props.isInvalid] - Indicates if the field is in an invalid state.
 * @param {boolean} [props.isDisabled] - Disables the input, preventing user interaction.
 * @param {boolean} [props.isHovered] - Applies hover state styling (handled by parent context).
 * @param {boolean} [props.isFocused] - Applies focused state styling (handled by parent context).
 * @param {boolean} [props.isRequired] - Marks the field as required.
 * @param {boolean} [props.isReadOnly] - Makes the field read-only (user cannot modify text).
 * @param {string} [props.placeholder] - Placeholder text displayed when the field is empty.
 * @returns {JSX.Element} A styled multi-line text input field.
 *
 * @example
 * ```tsx
 * <DescriptionBox
 *   size="lg"
 *   placeholder="Enter your project description..."
 *   isRequired
 * />
 * ```
 */
function DescriptionBox({
    size = 'md',
    isInvalid = false,
    isDisabled = false,
    isHovered = false,
    isFocused = false,
    isRequired = false,
    isReadOnly = false,
    placeholder,
	value,
	onChangeText
}: Props) {
    return (
        <Textarea  size={size} isInvalid={isInvalid} isDisabled={isDisabled} isHovered={isHovered} isFocused={isFocused} isRequired={isRequired} isReadOnly={isReadOnly}>
            <TextareaInput 
				placeholder={placeholder} 
				value={value} 
                onChangeText={onChangeText}
			/>
        </Textarea>
    );
}

export default DescriptionBox;