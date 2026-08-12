const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'A']);

export const sanitizeHtml = (html: string): string => {
  const documentFragment = new DOMParser().parseFromString(html, 'text/html');
  documentFragment.body.querySelectorAll('*').forEach((element) => {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }
    Array.from(element.attributes).forEach((attribute) => {
      const isSafeLink = element.tagName === 'A' && attribute.name === 'href' && /^(https?:|mailto:)/i.test(attribute.value);
      if (!isSafeLink) element.removeAttribute(attribute.name);
    });
    if (element.tagName === 'A') {
      element.setAttribute('target', '_blank');
      element.setAttribute('rel', 'noopener noreferrer');
    }
  });
  return documentFragment.body.innerHTML;
};
