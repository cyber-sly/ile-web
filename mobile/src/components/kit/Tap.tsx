import { forwardRef } from "react";
import { Pressable, type PressableProps, type PressableStateCallbackType, type StyleProp, type View, type ViewStyle } from "react-native";

// Pressable that always answers a touch with a light dim while pressed.
// Use it for anything tappable. `feedback={false}` turns the dim off
// (e.g. the invisible backdrop behind a sheet).
export type TapProps = PressableProps & { feedback?: boolean };

const pressedStyle: ViewStyle = { opacity: 0.6 };

const Tap = forwardRef<View, TapProps>(function Tap({ style, feedback = true, ...rest }, ref) {
  return (
    <Pressable
      ref={ref}
      style={(state: PressableStateCallbackType) => {
        const base = (typeof style === "function" ? style(state) : style) as StyleProp<ViewStyle>;
        return feedback && state.pressed ? [base, pressedStyle] : base;
      }}
      {...rest}
    />
  );
});

export default Tap;
