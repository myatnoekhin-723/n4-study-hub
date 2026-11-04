// Small DOM helpers shared by the views.
// Text is always set with textContent, never innerHTML, so user text
// (or an imported file) can never inject HTML.

export function byId(id) {
  return document.getElementById(id);
}

export function el(tag, className = '', text = '', lang = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  if (lang) node.lang = lang;
  return node;
}

// Fills a <select> with options, keeping the current choice if it still exists.
// options: [{ value, label }]
export function fillSelect(select, options, preferredValue = select.value) {
  select.replaceChildren(
    ...options.map(({ value, label }) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      return option;
    })
  );
  const values = options.map((option) => option.value);
  select.value = values.includes(preferredValue) ? preferredValue : values[0] ?? '';
}

// Shows each field's error under it and marks the input invalid.
// prefix + field gives the input id; prefix + field + '-error' gives the message id.
export function showFieldErrors(form, fields, errors, prefix) {
  fields.forEach((field) => {
    const message = errors[field] || '';
    byId(`${prefix}${field}-error`).textContent = message;
    const input = form.elements[field];
    if (message) {
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.removeAttribute('aria-invalid');
    }
  });
  const firstInvalid = fields.find((field) => errors[field]);
  if (firstInvalid) form.elements[firstInvalid].focus();
}
