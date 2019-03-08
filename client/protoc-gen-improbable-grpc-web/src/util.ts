/**
 * trimSuffix removes the supplied suffix from the end of the given string if present.
 *
 * @param {string} v source string which may contain the supplied suffix
 * @param {string} suffix suffix to remove if present
 * @returns {string} source string without suffix
 */
export function trimSuffix(v: string, suffix: string): string {
  const hasSuffix = v.slice(v.length - suffix.length) === suffix;
  return hasSuffix ? v.slice(0, -suffix.length) : v;
}

/**
 * trimPrefix removes the supplied prefix from the start of the given string if present.
 *
 * @param {string} v source string which may contain the supplied suffix
 * @param {string} prefix string to remove from the start of the source string, if present
 * @returns {string} source string without prefix
 */
export function trimPrefix(v: string, prefix: string): string {
  const hasPrefix = v.slice(0, prefix.length) === prefix;
  return hasPrefix ? v.slice(prefix.length) : v;
}

/**
 * makeImportNamespace creates a valid javascript variable name which can be used as the target namespace
 * when `require`-ing a proto.
 *
 * @param {string} filename filename of the proto being imported, eg: `foo/bar.proto`
 * @returns {string} a valid javascript variable name, eg: `foo_bar_pb`
 */
export function makeImportTargetNamespace(filename: string) {
  return trimSuffix(filename, ".proto")
    .replace(/\//g, "_")
    .replace(/\./g, "_")
    .replace(/-/g, "_") + "_pb";
}

/**
 * getRelativePathToRoot returns a new relative filepath string which traverses upward the
 * necessary number of folders to reach the root.
 *
 * @param {string} fp the input file path, eg: `foo/bar/baz`
 * @returns {string} the appropriate relative filepath, eg: `../../`.
 */
export function getRelativePathToRoot(fp: string) {
  const depth = fp.split("/").length;
  if (depth === 1) {
    return "./"
  }
  return new Array(depth).join("../");
}