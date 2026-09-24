import { Icon } from "@/src/components/atoms/Icon/Icon";
import {
    AccordionContent,
    AccordionContentText,
    AccordionHeader,
    AccordionItem,
    AccordionTitleText,
    AccordionTrigger,
    Accordion as BaseAccordion,
} from "@/src/components/ui/accordion";
import { Divider } from "@/src/components/ui/divider";
import React from "react";

// Tip za svaki item
interface AccordionItemData {
  id: string;
  title: string;
  content: string | React.ReactNode;
}

// Tip za propove (prosiruje sve propove originalnog Accordion-a)
interface AccordionProps
  extends React.ComponentProps<typeof BaseAccordion> {
  items: AccordionItemData[];
  className?: string;
}

export const Accordion = ({
  items,
  type = "single",
  isCollapsible = true,
  isDisabled = false,
  className,
  ...props
}: AccordionProps) => {
  return (
    <BaseAccordion
      size="lg"
      variant="unfilled"
      type={type}
      isCollapsible={isCollapsible}
      isDisabled={isDisabled}
      className={`w-[100%] rounded-3xl overflow-hidden ${className || ""}`}
      {...props}
    >
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          <AccordionItem value={item.id} className="py-2">
            <AccordionHeader className="py-1 px-4">
              <AccordionTrigger>
                {({ isExpanded }) => (
                  <>
                    <AccordionTitleText className="text-lg">
                        {item.title}
                    </AccordionTitleText>
                    <Icon
                      name={isExpanded ? "ChevronUp" : "ChevronDown"}
                      size={24}
                      style={{ marginLeft: 8 }}
                    />
                  </>
                )}
              </AccordionTrigger>
            </AccordionHeader>
            <AccordionContent className="px-10 pb-2">
                <AccordionContentText>
                    {item.content}
                </AccordionContentText>
            </AccordionContent>
          </AccordionItem>

          {/* Divider osim iza zadnjeg itema */}
          {index < items.length - 1 && <Divider />}
        </React.Fragment>
      ))}
    </BaseAccordion>
  );
};