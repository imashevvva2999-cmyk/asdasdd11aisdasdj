// Font files resolve to a URL string in bundlers (Vite asset imports).
declare module '*.ttf' {
  const url: string;
  export default url;
}
