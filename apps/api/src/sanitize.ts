import sanitizeHtml from 'sanitize-html';

const sanitize: any = typeof sanitizeHtml === 'function' ? sanitizeHtml : (sanitizeHtml as any).default;

export const sanitizeNoticeHtml = (html: string) => sanitize(html, {
  allowedTags: ['p','br','strong','b','em','i','u','s','ul','ol','li','h1','h2','h3','blockquote','a'],
  allowedAttributes: { a: ['href'] },
  allowedSchemes: ['http','https','mailto'],
  allowProtocolRelative: false,
  transformTags: { a: (sanitize.simpleTransform || (sanitizeHtml as any).simpleTransform)('a', { rel: 'noopener noreferrer', target: '_blank' }) }
});
