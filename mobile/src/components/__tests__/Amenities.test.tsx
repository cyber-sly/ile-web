import { expect, jest, test } from "@jest/globals";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import Amenities from "../wizard/steps/Amenities";

test("Amenities step toggles a chip and adds a custom amenity", () => {
  let values: Record<string, any> = { category: "stays", features: [] };
  const set = jest.fn((changes: Record<string, any>) => {
    values = { ...values, ...changes };
  });
  let r: ReactTestRenderer;
  act(() => {
    r = create(<Amenities values={values} set={set} errors={{}} />);
  });
  act(() => r!.root.findByProps({ accessibilityLabel: "Wi-Fi" }).props.onPress());
  expect(values.features).toEqual(["Wi-Fi"]);

  act(() => r!.update(<Amenities values={values} set={set} errors={{}} />));
  act(() => r!.root.findByProps({ accessibilityLabel: "Add your own amenity" }).props.onChangeText("Rooftop"));
  act(() => r!.root.findByProps({ accessibilityLabel: "Add amenity" }).props.onPress());
  expect(values.features).toEqual(["Wi-Fi", "Rooftop"]);

  act(() => r!.update(<Amenities values={values} set={set} errors={{}} />));
  act(() => r!.root.findByProps({ accessibilityLabel: "Wi-Fi" }).props.onPress());
  expect(values.features).toEqual(["Rooftop"]);
});
