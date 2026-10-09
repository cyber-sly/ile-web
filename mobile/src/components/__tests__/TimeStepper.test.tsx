import { expect, jest, test } from "@jest/globals";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import TimeStepper from "../TimeStepper";

function press(r: ReactTestRenderer, label: string) {
  act(() => r.root.findByProps({ accessibilityLabel: label }).props.onPress());
}

test("TimeStepper steps by 30 minutes and stops at its limits", () => {
  const onChange = jest.fn();
  let r: ReactTestRenderer;
  act(() => {
    r = create(<TimeStepper label="Start" value="21:00" onChange={onChange} step={30} min="06:00" max="21:00" />);
  });
  press(r!, "Start later");
  expect(onChange).not.toHaveBeenCalled();

  act(() => {
    r!.update(<TimeStepper label="Start" value="10:00" onChange={onChange} step={30} min="06:00" max="21:00" />);
  });
  press(r!, "Start earlier");
  expect(onChange).toHaveBeenLastCalledWith("09:30");
});
