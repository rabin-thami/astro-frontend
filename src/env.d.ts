/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Shared per-request payloads set by src/middleware.ts. */
    themeHead: import("./lib/graphql/queries/getTheme").ThemeHead;
    layout: import("./lib/graphql/queries/getLayout").LayoutConfig;
  }
}
