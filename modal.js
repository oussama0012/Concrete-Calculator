(function(){
    function makeOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'ui-modal-overlay';
        overlay.innerHTML = `
            <div class="ui-dialog" role="dialog" aria-modal="true">
                <div class="ui-header">
                    <div class="ui-title"></div>
                    <button class="ui-close" aria-label="Close">×</button>
                </div>
                <div class="ui-body"></div>
                <div class="ui-footer"></div>
            </div>`;
        return overlay;
    }

    function closeOverlay(overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 180);
    }

    function uiConfirm(message, title = 'Confirm') {
        return new Promise(resolve => {
            const overlay = makeOverlay();
            overlay.querySelector('.ui-title').textContent = title;
            overlay.querySelector('.ui-body').innerHTML = `<p>${message}</p>`;
            const footer = overlay.querySelector('.ui-footer');
            const cancel = document.createElement('button');
            cancel.className = 'ui-btn secondary';
            cancel.textContent = 'Cancel';
            const ok = document.createElement('button');
            ok.className = 'ui-btn primary';
            ok.textContent = 'Confirm';
            footer.append(cancel, ok);
            cancel.onclick = () => { resolve(false); closeOverlay(overlay); };
            ok.onclick = () => { resolve(true); closeOverlay(overlay); };
            overlay.querySelector('.ui-close').onclick = cancel.onclick;
            overlay.addEventListener('click', e => { if (e.target === overlay) cancel.onclick(); });
            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('show'));
        });
    }

    function uiPrompt({ title = 'Input', message = '', defaultValue = '', placeholder = '' } = {}) {
        return new Promise(resolve => {
            const overlay = makeOverlay();
            overlay.querySelector('.ui-title').textContent = title;
            overlay.querySelector('.ui-body').innerHTML = `
                <p>${message}</p>
                <input class="ui-input" type="text" placeholder="${placeholder}" value="${defaultValue}">
            `;
            const input = overlay.querySelector('.ui-input');
            const footer = overlay.querySelector('.ui-footer');
            const cancel = document.createElement('button');
            cancel.className = 'ui-btn secondary';
            cancel.textContent = 'Cancel';
            const save = document.createElement('button');
            save.className = 'ui-btn primary';
            save.textContent = 'Save';
            footer.append(cancel, save);

            const finish = (val) => { resolve(val); closeOverlay(overlay); };
            cancel.onclick = () => finish(null);
            save.onclick = () => finish(input.value.trim() || defaultValue);
            overlay.querySelector('.ui-close').onclick = cancel.onclick;
            overlay.addEventListener('click', e => { if (e.target === overlay) cancel.onclick(); });
            input.addEventListener('keydown', e => { if (e.key === 'Enter') save.onclick(); });

            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('show'));
            setTimeout(() => input.focus(), 60);
        });
    }

    window.uiConfirm = uiConfirm;
    window.uiPrompt = uiPrompt;
})();
