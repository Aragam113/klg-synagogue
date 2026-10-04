/** Native: no DOM, nothing to wire. The web build uses press.web.ts (same exports). */
export const installPress = (): (() => void) => () => undefined;
export const usePressFeedback = (): void => undefined;
