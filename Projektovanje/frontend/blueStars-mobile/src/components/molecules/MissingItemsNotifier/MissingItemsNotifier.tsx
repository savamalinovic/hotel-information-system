import { Icon } from "../../atoms/Icon/Icon";
import { Label } from "../../atoms/Label/Label";
import { HStack } from "../../ui/hstack";

interface Props {
	label: string;
}

export default function MissingItemsNotifier({ label }: Props) {
	return (
		<HStack>
			<Icon name="Info" />
			<Label text={" " + label} color="gray" />
		</HStack> 
	);
}