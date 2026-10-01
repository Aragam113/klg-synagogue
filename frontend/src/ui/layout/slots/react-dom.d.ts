// @types/react-dom is not installed; TodayWidget (bar variant) only needs createPortal.
declare module 'react-dom' {
  export function createPortal(
    children: import('react').ReactNode,
    container: Element
  ): import('react').ReactPortal;
}
