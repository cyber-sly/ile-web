// Holds back auth events until start-up (remember-me + 30-day check) is
// done, so an inactive user is never shown as signed in for a moment.
export function createStartupGate() {
  let ready = false;
  return {
    open() {
      ready = true;
    },
    wrap<A extends unknown[]>(fn: (...args: A) => void) {
      return (...args: A) => {
        if (ready) fn(...args);
      };
    },
  };
}
