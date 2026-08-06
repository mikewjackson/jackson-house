(function () {
    const form = document.querySelector('form[name="contact"]');
    const nameField = document.getElementById('contact-name');
    const subjectField = document.getElementById('contact-subject');

    if (!form || !nameField || !subjectField) return;

    // Netlify's subject value is static HTML fixed at deploy time, so it can't
    // reference the submitter's name on its own. Rewrite it right before submit
    // using the name they entered, falling back to the default if left blank.
    form.addEventListener('submit', () => {
        const name = nameField.value.trim();
        if (name) {
            subjectField.value = `Jackson House Contact Request from ${name}`;
        }
    });
})();
