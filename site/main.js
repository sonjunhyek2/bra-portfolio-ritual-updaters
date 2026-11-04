(() => {
  'use strict';
  const data = window.BRA_DATA;
  if (data && data.stats) {
    for (const [key, value] of Object.entries(data.stats)) {
      if (Number.isInteger(value)) {
        for (const node of document.querySelectorAll(`[data-stat="${key}"]`)) {
          node.textContent = String(value);
        }
      }
    }
    const grid = document.getElementById('approved-evidence');
    if (grid) {
      grid.replaceChildren();
      for (const evidence of data.approved_evidence || []) {
        const article = document.createElement('article');
        article.className = 'evidence';
        const dt = document.createElement('time');
        dt.dateTime = evidence.date;
        dt.textContent = evidence.date;
        const title = document.createElement('h4');
        title.textContent = evidence.ability;
        const paragraph = document.createElement('p');
        paragraph.textContent = evidence.evidence;
        const note = document.createElement('small');
        note.textContent = `출처: ${evidence.source}`;
        article.append(dt, title, paragraph, note);
        grid.append(article);
      }
      if (grid.children.length === 0) grid.textContent = '공개 승인한 근거가 없습니다.';
    }
  }
  const contact = document.getElementById('contact-link');
  if (contact) {
    const isPlaceholder = contact.getAttribute('href').includes('CONTACT_EMAIL_HERE');
    if (isPlaceholder) contact.addEventListener('click', (event) => event.preventDefault());
    else {
      contact.removeAttribute('aria-disabled');
      const notice = document.getElementById('contact-alert');
      if (notice) notice.hidden = true;
    }
  }
})();
