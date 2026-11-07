// The Google Maps JavaScript API is loaded dynamically at runtime (see
// LocationCard.tsx) rather than installed as a dependency, so there's no
// official type package in play here. Typing `window.google` as `any` is a
// deliberate, pragmatic choice — pulling in @types/google.maps for one
// self-contained map widget isn't worth the dependency weight. Keep any
// Google Maps API usage isolated to LocationCard.tsx so this loose typing
// doesn't leak elsewhere.
export {};

declare global {
  interface Window {
    google?: any;
  }
}
