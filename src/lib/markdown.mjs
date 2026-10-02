import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { base } from './site.mjs';

let processor;

function localize(html) {
  return html
    .replace(/href="\/(?!\/|status-compass\/)/g, `href="${base}`)
    .replace(/src="\/(?!\/|status-compass\/)/g, `src="${base}`);
}

export async function renderMarkdown(markdown) {
  processor ||= await createSatteriMarkdownProcessor();
  const rendered = await processor.render(markdown || '');
  return {
    html: localize(rendered.code),
    headings: rendered.metadata.headings.filter((heading) => heading.depth === 2)
  };
}
