import React from "react";

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function Button(props, ref) {
  return (
    <button
      {...props}
      ref={ref}
      className="text-xs h-7 border-violet-700 border px-2 rounded bg-violet-600 text-violet-50 flex items-center gap-1 font-semibold hover:bg-violet-700 disabled:bg-gray-300 disabled:text-gray-900 disabled:border-gray-700"
    />
  );
});
