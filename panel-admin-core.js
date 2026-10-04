# Panel administratora

To jest osobny moduł rozbudowy panelu administratora, który nie ingeruje w główny plik `index.html`.

Zasada działania:
- panel jest renderowany dynamicznie po stronie klienta,
- widok admina aktywuje się tylko dla użytkownika o ID `7777540542`,
- pozostali użytkownicy widzą tylko publiczne materiały (posty, zdjęcia, pliki, przegląd),
- nie ruszamy oryginalnego HTML, tylko dodajemy osobny moduł JS.

Uwaga: skrypt należy podpiąć w projekcie jako osobny plik JS, np. przez standardowy import na końcu HTML albo przez dynamiczne dodanie skryptu w aplikacji.

```js
(function () {
  const ADMIN_ID = '7777540542';
  const STORAGE = {
    admin: 'tp_admin_panel_state',
    posts: 'tp_public_posts',
    tasks: 'tp_tasks_list',
    notifications: 'tp_notifications_list'
  };

  function readStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function currentUserId() {
    const fromTelegram = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.id);
    if (fromTelegram) return String(fromTelegram);
    return String(localStorage.getItem('tp_current_user_id') || 'guest');
  }

  function isAdmin() {
    return currentUserId() === String(ADMIN_ID);
  }

  function ensureDefaults() {
    const posts = readStorage(STORAGE.posts, [
      {
        author: 'System',
        title: 'Witamy w nowym przeglądzie',
        text: 'Tutaj pojawiają się publiczne posty i materiały dodawane przez administratora.',
        type: 'post',
        time: new Date().toISOString()
      }
    ]);
    writeStorage(STORAGE.posts, posts);

    const tasks = readStorage(STORAGE.tasks, [
      { id: 1, title: 'Zaloguj się do aplikacji', reward: 25, done: false },
      { id: 2, title: 'Sprawdź nowy przegląd', reward: 45, done: false },
      { id: 3, title: 'Odbierz bonus dzienny', reward: 55, done: false }
    ]);
    writeStorage(STORAGE.tasks, tasks);

    const notifications = readStorage(STORAGE.notifications, [
      { id: 1, title: 'Nowy post', body: 'Przegląd został zaktualizowany.', time: new Date().toISOString() }
    ]);
    writeStorage(STORAGE.notifications, notifications);
  }

  function injectStyles() {
    if (document.getElementById('tp-admin-panel-style')) return;
    const style = document.createElement('style');
    style.id = 'tp-admin-panel-style';
    style.textContent = `
      .tp-admin-shell { display: grid; gap: 12px; }
      .tp-admin-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .tp-admin-card {
        background: rgba(15, 23, 42, 0.9);
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 14px;
        padding: 12px;
      }
      .tp-admin-title { font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #a78bfa; }
      .tp-admin-input, .tp-admin-textarea, .tp-admin-select {
        width: 100%; background: #050b13; border: 1px solid rgba(148,163,184,0.25); color: #e2e8f0; border-radius: 12px; padding: 10px 12px; font-size: 12px; outline: none;
      }
      .tp-admin-btn {
        background: linear-gradient(135deg, #8b5cf6, #22d3ee); color: white; border: 0; border-radius: 12px; font-weight: 700; font-size: 11px; padding: 10px 12px; cursor: pointer;
      }
      .tp-public-post {
        background: rgba(15, 23, 42, 0.82);
        border: 1px solid rgba(148,163,184,0.16);
        border-radius: 14px;
        padding: 12px;
        display: grid; gap: 8px;
      }
      .tp-public-post strong { color: #f8fafc; }
      .tp-public-meta { font-size: 10px; color: #94a3b8; }
      .tp-mini-stat { background: rgba(15,23,42,0.8); border: 1px solid rgba(148,163,184,0.18); border-radius: 12px; padding: 10px; }
      .tp-pill { display: inline-flex; align-items:center; gap:6px; padding:4px 8px; border-radius: 999px; font-size: 9px; font-weight: 700; }
    `;
    document.head.appendChild(style);
  }

  function renderAdminPanel() {
    const target = document.getElementById('admin-panel-container');
    if (!target) return;

    target.classList.remove('hidden');
    target.innerHTML = `
      <div class="tp-admin-shell">
        <div class="tp-admin-card">
          <div class="tp-admin-title">Panel Administratora</div>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:8px;">
            <span class="tp-pill" style="background: rgba(139, 92, 246, 0.12); color: #d8b4fe; border: 1px solid rgba(139, 92, 246, 0.3)">ID: ${ADMIN_ID}</span>
            <span class="tp-pill" style="background: rgba(34, 211, 238, 0.12); color: #a5f3fc; border: 1px solid rgba(34, 211, 238, 0.3)">Tryb: ADMIN</span>
          </div>
        </div>

        <div class="tp-admin-grid">
          <div class="tp-admin-card">
            <div class="tp-admin-title">Posty</div>
            <textarea id="tp-admin-post-text" class="tp-admin-textarea" rows="3" placeholder="Treść posta..." style="margin-top:10px;"></textarea>
            <input id="tp-admin-post-title" class="tp-admin-input" style="margin-top:8px;" placeholder="Tytuł posta" />
            <input id="tp-admin-post-image" class="tp-admin-input" style="margin-top:8px;" placeholder="URL zdjęcia / media" />
            <button class="tp-admin-btn" style="margin-top:10px; width:100%;" id="tp-admin-publish-post">Opublikuj post</button>
          </div>

          <div class="tp-admin-card">
            <div class="tp-admin-title">Event Live</div>
            <input id="tp-admin-event-title" class="tp-admin-input" style="margin-top:10px;" placeholder="Tytuł eventu" />
            <textarea id="tp-admin-event-desc" class="tp-admin-textarea" rows="3" placeholder="Opis eventu..." style="margin-top:8px;"></textarea>
            <input id="tp-admin-event-reward" class="tp-admin-input" style="margin-top:8px;" placeholder="Nagroda (np. 50)" />
            <button class="tp-admin-btn" style="margin-top:10px; width:100%;" id="tp-admin-save-event">Zapisz event</button>
          </div>

          <div class="tp-admin-card">
            <div class="tp-admin-title">Zadania</div>
            <input id="tp-admin-task-title" class="tp-admin-input" style="margin-top:10px;" placeholder="Nazwa zadania" />
            <input id="tp-admin-task-reward" class="tp-admin-input" style="margin-top:8px;" placeholder="Nagroda w gwiazdkach" />
            <button class="tp-admin-btn" style="margin-top:10px; width:100%;" id="tp-admin-add-task">Dodaj zadanie</button>
          </div>

          <div class="tp-admin-card">
            <div class="tp-admin-title">Powiadomienia</div>
            <input id="tp-admin-notify-title" class="tp-admin-input" style="margin-top:10px;" placeholder="Tytuł powiadomienia" />
            <textarea id="tp-admin-notify-body" class="tp-admin-textarea" rows="3" placeholder="Treść powiadomienia..." style="margin-top:8px;"></textarea>
            <button class="tp-admin-btn" style="margin-top:10px; width:100%;" id="tp-admin-send-notify">Wyślij do użytkowników</button>
          </div>
        </div>

        <div class="tp-admin-card">
          <div class="tp-admin-title">Statystyki</div>
          <div class="tp-admin-grid" style="margin-top:10px;">
            <div class="tp-mini-stat"><div style="font-size:10px; color:#94a3b8;">Użytkownicy</div><div id="tp-stat-users" style="font-size:20px; font-weight:900; color:#67e8f9;">0</div></div>
            <div class="tp-mini-stat"><div style="font-size:10px; color:#94a3b8;">Posty</div><div id="tp-stat-posts" style="font-size:20px; font-weight:900; color:#c4b5fd;">0</div></div>
            <div class="tp-mini-stat"><div style="font-size:10px; color:#94a3b8;">Eventy</div><div id="tp-stat-events" style="font-size:20px; font-weight:900; color:#6ee7b7;">0</div></div>
            <div class="tp-mini-stat"><div style="font-size:10px; color:#94a3b8;">Zadania</div><div id="tp-stat-tasks" style="font-size:20px; font-weight:900; color:#fbbf24;">0</div></div>
          </div>
        </div>
      </div>
    `;

    const posts = readStorage(STORAGE.posts, []);
    const tasks = readStorage(STORAGE.tasks, []);
    const notifications = readStorage(STORAGE.notifications, []);
    document.getElementById('tp-stat-users').textContent = '1';
    document.getElementById('tp-stat-posts').textContent = String(posts.length);
    document.getElementById('tp-stat-tasks').textContent = String(tasks.length);
    document.getElementById('tp-stat-events').textContent = '1';

    const publishBtn = document.getElementById('tp-admin-publish-post');
    publishBtn.addEventListener('click', () => {
      const title = document.getElementById('tp-admin-post-title').value.trim();
      const text = document.getElementById('tp-admin-post-text').value.trim();
      const image = document.getElementById('tp-admin-post-image').value.trim();
      if (!title && !text) return;
      const postsList = readStorage(STORAGE.posts, []);
      postsList.unshift({
        id: Date.now(),
        author: 'Administrator',
        title,
        text,
        image,
        type: 'post',
        time: new Date().toISOString()
      });
      writeStorage(STORAGE.posts, postsList);
      renderPublicPosts();
      document.getElementById('tp-admin-post-title').value = '';
      document.getElementById('tp-admin-post-text').value = '';
      document.getElementById('tp-admin-post-image').value = '';
    });

    const taskBtn = document.getElementById('tp-admin-add-task');
    taskBtn.addEventListener('click', () => {
      const title = document.getElementById('tp-admin-task-title').value.trim();
      const reward = Number(document.getElementById('tp-admin-task-reward').value || 0);
      if (!title) return;
      const taskList = readStorage(STORAGE.tasks, []);
      taskList.unshift({ id: Date.now(), title, reward, done: false });
      writeStorage(STORAGE.tasks, taskList);
      renderTasks();
      document.getElementById('tp-admin-task-title').value = '';
      document.getElementById('tp-admin-task-reward').value = '';
    });

    const notifyBtn = document.getElementById('tp-admin-send-notify');
    notifyBtn.addEventListener('click', () => {
      const title = document.getElementById('tp-admin-notify-title').value.trim();
      const body = document.getElementById('tp-admin-notify-body').value.trim();
      if (!title || !body) return;
      const list = readStorage(STORAGE.notifications, []);
      list.unshift({ id: Date.now(), title, body, time: new Date().toISOString() });
      writeStorage(STORAGE.notifications, list);
      renderNotifications();
      document.getElementById('tp-admin-notify-title').value = '';
      document.getElementById('tp-admin-notify-body').value = '';
    });

    const eventBtn = document.getElementById('tp-admin-save-event');
    eventBtn.addEventListener('click', () => {
      const title = document.getElementById('tp-admin-event-title').value.trim();
      const desc = document.getElementById('tp-admin-event-desc').value.trim();
      const reward = document.getElementById('tp-admin-event-reward').value.trim();
      if (!title || !desc) return;
      const state = readStorage(STORAGE.admin, {});
      state.event = { title, desc, reward };
      writeStorage(STORAGE.admin, state);
      renderLiveEvent();
    });
  }

  function renderPublicPosts() {
    const feed = document.getElementById('channel-feed') || document.getElementById('posts-feed');
    if (!feed) return;
    const posts = readStorage(STORAGE.posts, []);
    feed.innerHTML = posts.map(post => {
      const media = post.image ? `<img src="${post.image}" style="width:100%; border-radius:12px; max-height:160px; object-fit:cover;" />` : '';
      return `
        <div class="tp-public-post">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>${post.title || 'Nowy materiał'}</strong>
            <span class="tp-pill" style="background: rgba(34, 211, 238, 0.12); color: #a5f3fc; border: 1px solid rgba(34,211,238,0.3)">${post.author || 'admin'}</span>
          </div>
          ${media}
          <div style="font-size:12px; color:#e2e8f0; line-height:1.5;">${post.text || ''}</div>
          <div class="tp-public-meta">${new Date(post.time || Date.now()).toLocaleString('pl-PL')}</div>
        </div>
      `;
    }).join('');
  }

  function renderTasks() {
    const taskList = document.getElementById('task-list');
    if (!taskList) return;
    const tasks = readStorage(STORAGE.tasks, []);
    taskList.innerHTML = tasks.map(task => `
      <div class="tp-admin-card" style="padding:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div>
            <div style="font-size:12px; font-weight:700; color:#f8fafc;">${task.title}</div>
            <div style="font-size:10px; color:#94a3b8;">Nagroda: ${task.reward || 0} ★</div>
          </div>
          <button class="tp-admin-btn" data-task-id="${task.id}" style="font-size:10px; padding:7px 10px;">Ukończ</button>
        </div>
      </div>
    `).join('');

    taskList.querySelectorAll('[data-task-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tasksList = readStorage(STORAGE.tasks, []);
        const filtered = tasksList.filter(t => String(t.id) !== btn.dataset.taskId);
        writeStorage(STORAGE.tasks, filtered);
        renderTasks();
      });
    });
  }

  function renderNotifications() {
    const target = document.getElementById('reward-log');
    if (!target) return;
    const notifications = readStorage(STORAGE.notifications, []);
    target.innerHTML = notifications.map(item => `
      <div class="tp-admin-card" style="padding:10px;">
        <div style="font-size:11px; font-weight:800; color:#c4b5fd;">${item.title}</div>
        <div style="font-size:11px; color:#e2e8f0; margin-top:4px;">${item.body}</div>
        <div class="tp-public-meta" style="margin-top:6px;">${new Date(item.time || Date.now()).toLocaleString('pl-PL')}</div>
      </div>
    `).join('');
  }

  function renderLiveEvent() {
    const titleTarget = document.getElementById('live-event-title');
    const descTarget = document.getElementById('live-event-desc');
    const eventState = readStorage(STORAGE.admin, {}).event || {
      title: 'Cyber Week — Community Sprint',
      desc: 'Wykonuj zadania społecznościowe, zbieraj gwiazdki i odblokuj limitowaną odznakę.'
    };
    if (titleTarget) titleTarget.textContent = eventState.title;
    if (descTarget) descTarget.textContent = eventState.desc;
  }

  function renderUserView() {
    renderPublicPosts();
    renderTasks();
    renderNotifications();
    renderLiveEvent();
  }

  function init() {
    ensureDefaults();
    injectStyles();
    if (isAdmin()) {
      renderAdminPanel();
      renderUserView();
    } else {
      const adminPanel = document.getElementById('admin-panel-container');
      if (adminPanel) adminPanel.classList.add('hidden');
      renderUserView();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

Wykorzystanie:
- moduł jest odseparowany od `index.html`,
- aktywuje panel admina tylko dla `7777540542`,
- wszyscy inni użytkownicy dostają publiczny widok materiałów,
- dane przechowywane są w `localStorage`, więc nie trzeba modyfikować oryginalnej struktury HTML.

To jest bezpieczny pierwszy krok, który zachowuje niezmienioną główną aplikację i pozwala rozbudować panel w małych, niezależnych paczkach.

"""
} ,{