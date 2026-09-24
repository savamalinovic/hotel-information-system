import { LucideIconName } from "@/src/types/types";
import { Icon } from "../../atoms/Icon/Icon";
import { Menu, MenuItem, MenuItemLabel, MenuSeparator } from "../../ui/menu";

export interface CustomMenuItemProp {
	key: string;
	textValue: string;
	iconName?: LucideIconName;
	isLastItem?: boolean;
	onPress?: () => void;
}

type MenuPlacement = "bottom" | "top" | "right" | "left" | "top left" | "top right" | "bottom left" | "bottom right" | "right top" | "right bottom" | "left top" |
"left bottom";

interface Props {
	items: CustomMenuItemProp[];

	renderTrigger: (triggerProps: any) => React.ReactElement;
	placement?: MenuPlacement;
	defaultIsOpen?: boolean;
	onOpen?: () => void;
	onClose?: () => void;
	isOpen?: boolean;
	offset?: number;
	crossOffset?: number;
	closeOnSelect?: boolean;
	selectionMode?: 'none' | 'single' | 'multiple';
}

export default function CustomMenu(props: Props) {
	return (
		<Menu
			{...props}
			placement={props.placement || "top"}
			trigger={(triggerProps) => {
                return props.renderTrigger(triggerProps);
            }}
			style={{ marginBottom: 40 }}
		>
			{
				props.items.map((item) => (
					<>
						<MenuItem key={item.key} textValue={item.textValue} className="p-2" onPress={item.onPress}>
							{ item.iconName && <Icon name={item.iconName} size={16} style={{ marginRight: 10 }} />}
							<MenuItemLabel size="sm">{item.textValue}</MenuItemLabel>
						</MenuItem>
						{item.isLastItem ? <MenuSeparator /> : null}  
					</>
				))
			}
		</Menu>
	);
}