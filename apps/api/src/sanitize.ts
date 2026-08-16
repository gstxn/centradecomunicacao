import sanitizeHtml from 'sanitize-html';

export const sanitizeNoticeHtml = (html: string) => sanitizeHtml(html, {
  allowedTags: ['p','br','strong','b','em','i','u','s','ul','ol','li','h1','h2','h3','blockquote','a'],
  allowedAttributes: { a: ['href'] },
  allowedSchemes: ['http','https','mailto'],
  allowProtocolRelative: false,
  transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }) }
});
