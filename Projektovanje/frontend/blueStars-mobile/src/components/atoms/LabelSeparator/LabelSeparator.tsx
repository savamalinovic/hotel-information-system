import { Divider } from "@/src/components/ui/divider";
import { HStack } from "@/src/components/ui/hstack";
import { Text } from "@/src/components/ui/text";

interface Props {
    label: string;
}

/**
 * LabelSeparator component
 *
 * A horizontal separator with a centered label, used to visually
 * divide sections of content (e.g., between form fields, buttons, or list groups).
 *
 *
 * @param {Object} props - The component props.
 * @param {string} props.label - The text displayed at the center of the separator.
 * @returns {JSX.Element} A horizontal divider with a centered label.
 *
 * @example
 * ```tsx
 * <LabelSeparator label="Or continue with" />
 * ```
 */
function LabelSeparator({ label }: Props) {
    return(
        <HStack space="md" className="w-100 items-center content-center ">
            <Divider className="flex-1 bg-gray-400 ml-2" />
            <Text className="mr-2 ml-2">{label}</Text>
            <Divider className="flex-1 bg-gray-400 mr-2" />
        </HStack>
    );
}

export default LabelSeparator;