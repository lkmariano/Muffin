import { renderPage } from "../rendering/page.js";
import type { PageRenderer } from "../rendering/context.js";

/**
 * Muffin's default page renderer — every page renders through this file.
 *
 * This is the one place to customize presentation for your site, e.g.:
 *
 *   if (context.page.metadata.frontmatter.type === "writings") {
 *     return renderWritingPage(context);   // your layout
 *   }
 *   return renderPage(context, template);  // Muffin's stock shell
 *
 * Muffin itself never interprets frontmatter values — site-defined page types
 * are decided here, at the site layer. Renderers must not import `fs` or
 * perform filesystem operations.
 */
export const renderSitePage: PageRenderer = (context, template) =>
  renderPage(context, template);