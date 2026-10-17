/** CSS module type shim (the build script compiles .module.css inline). */
declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}
