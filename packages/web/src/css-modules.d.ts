// Allow importing CSS files as side-effect imports (e.g. `import "./globals.css"`).
// TypeScript 7 no longer infers these from Next's ambient types the way TS 5 did.
declare module "*.css";
