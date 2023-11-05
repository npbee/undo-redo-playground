import React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { CheckIcon, DividerHorizontalIcon } from "@radix-ui/react-icons";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  { children: React.ReactNode }
>(({ children, ...props }, forwardedRef) => {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        {...props}
        ref={forwardedRef}
        className="min-w-[220px] bg-white rounded-md p-4 shadow-lg"
        sideOffset={5}
        align="start"
      >
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
});

export const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  DropdownMenuPrimitive.DropdownMenuLabelProps
>(function DropdownMenuLabel(props, ref) {
  return (
    <DropdownMenuPrimitive.Label
      {...props}
      ref={ref}
      className="text-xs px-2 leading-6 text-gray-600"
    />
  );
});

export const DropdownMenuGroup = DropdownMenuPrimitive.Group;

export const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  DropdownMenuPrimitive.DropdownMenuItemProps
>(function DropdownMenuItem(props, ref) {
  return (
    <DropdownMenuPrimitive.Item
      {...props}
      ref={ref}
      className="group text-sm leading-none text-gray-800 rounded-sm flex items-center h-6 px-2 select-none outline-none data-[highlighted]:bg-violet-500 data-[highlighted]:text-violet-100"
    />
  );
});

export const DropdownMenuCheckboxItem = React.forwardRef<
  HTMLDivElement,
  DropdownMenuPrimitive.DropdownMenuCheckboxItemProps
>(({ children, ...props }, forwardedRef) => {
  return (
    <DropdownMenuPrimitive.CheckboxItem {...props} ref={forwardedRef}>
      {children}
      <DropdownMenuPrimitive.ItemIndicator>
        {props.checked === "indeterminate" && <DividerHorizontalIcon />}
        {props.checked === true && <CheckIcon />}
      </DropdownMenuPrimitive.ItemIndicator>
    </DropdownMenuPrimitive.CheckboxItem>
  );
});

export const DropdownMenuRadioItem = React.forwardRef<
  HTMLDivElement,
  DropdownMenuPrimitive.DropdownMenuRadioItemProps
>(({ children, ...props }, forwardedRef) => {
  return (
    <DropdownMenuPrimitive.RadioItem
      {...props}
      ref={forwardedRef}
      className="text-sm leading-none text-violet-800 rounded-sm flex items-center h-[25px] px-2 relative pl-[25px] select-none outline-none data-[highlighted]:bg-violet-700 data-[highlighted]:text-violet-50"
    >
      {children}
      <DropdownMenuPrimitive.ItemIndicator className="absolute left-0 w-[25px] inline-flex items-center justify-center">
        <CheckIcon />
      </DropdownMenuPrimitive.ItemIndicator>
    </DropdownMenuPrimitive.RadioItem>
  );
});

export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  DropdownMenuPrimitive.DropdownMenuSeparatorProps
>(function Separator(props, ref) {
  return (
    <DropdownMenuPrimitive.Separator
      {...props}
      ref={ref}
      className="h-[1px] bg-violet-200 m-2"
    />
  );
});
