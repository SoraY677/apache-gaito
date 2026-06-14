/// <reference types="vite/client" />

// CSS module declarations
declare module '*.css' {
  const styles: Record<string, string>;
  export default styles;
}
