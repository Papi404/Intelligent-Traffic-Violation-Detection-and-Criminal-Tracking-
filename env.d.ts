// This file tells TypeScript to trust that the '@google/genai' module exists.
// It's necessary because we are loading it from a CDN via an importmap,
// which the TypeScript compiler doesn't understand by default.
declare module '@google/genai';
