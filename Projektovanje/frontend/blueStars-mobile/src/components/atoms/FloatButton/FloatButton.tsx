import { Fab, FabLabel } from "@/src/components/ui/fab";
import { Icon } from "../Icon/Icon";


interface Props {
    size?: "sm" | "md" | "lg";
    placement?: "top left" | "top right" | "bottom left" | "bottom right" | "top center" | "bottom center";
    label?: string;
    icon?: any;
    onClick: () => void;
}

/**
 * Floating action button component.
 *
 * Renders a circular floating button with optional icon and label.
 * The button can be placed in various positions on the screen
 * and supports different size variants.
 *
 * @param {Props} props - The component props.
 * @param {"sm" | "md" | "lg"} [props.size="md"] - The size of the button.
 * @param {
 *   "top left" | "top right" | 
 *   "bottom left" | "bottom right" | 
 *   "top center" | "bottom center"
 * } [props.placement="bottom right"] - Where the button should be placed.
 * @param {string} [props.label] - Optional label to display next to the icon.
 * @param {React.ReactNode | (() => JSX.Element)} [props.icon] - Custom icon or render function.
 * @param {() => void} props.onClick - Handler invoked when the button is pressed.
 * @returns {JSX.Element} The rendered floating action button.
 */
function FloatButton({
    size = "md",
    placement = "bottom right",
    label,
    icon = () => <Icon size={20} name="Plus" color="white" />,
    onClick,
	...otherProps
}: Props) {

    return(
        <Fab size={size} placement={placement} onPress={onClick} {...otherProps} >
            <Icon name="Plus" strokeWidth={2.2} size={28} color="white" />
            {label && <FabLabel>{label}</FabLabel>}
        </Fab>
    );
}

export default FloatButton;